import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Training } from './entities/training.entity';
import { Group } from '../groups/entities/group.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class TrainingsService {
  constructor(
    @InjectRepository(Training)
    private trainingsRepository: Repository<Training>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(Parent)
    private parentsRepository: Repository<Parent>,
  ) {}

  async create(createTrainingDto: CreateTrainingDto): Promise<Training> {
    // Check if group exists
    const group = await this.groupsRepository.findOne({
      where: { id: createTrainingDto.groupId },
    });

    if (!group) {
      throw new NotFoundException(
        `Group with id ${createTrainingDto.groupId} not found`,
      );
    }

    // Validate endTime > startTime
    if (createTrainingDto.endTime <= createTrainingDto.startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const training = this.trainingsRepository.create({
      ...createTrainingDto,
      group,
    });

    return await this.trainingsRepository.save(training);
  }

  async findAll(): Promise<Training[]> {
    return await this.trainingsRepository.find({
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }

  async findByGroup(groupId: string): Promise<Training[]> {
    // Check if group exists
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    return await this.trainingsRepository.find({
      where: { group: { id: groupId } },
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Training & { group: Group & { players: Player[] } }> {
    const training = await this.trainingsRepository.findOne({
      where: { id },
      relations: ['group', 'group.players'],
    });

    if (!training) {
      throw new NotFoundException(`Training with id ${id} not found`);
    }

    return training as Training & { group: Group & { players: Player[] } };
  }

  async findMyTrainings(
    userId: string,
    role: UserRole,
  ): Promise<Training[]> {
    let groupIds: string[] = [];

    if (role === UserRole.ADMIN) {
      return this.findAll();
    }

    if (role === UserRole.COACH) {
      const coach = await this.coachesRepository.findOne({
        where: { user: { id: userId } },
        relations: ['headGroups', 'assistantGroups'],
      });
      if (coach) {
        groupIds = [
          ...coach.headGroups.map((g) => g.id),
          ...coach.assistantGroups.map((g) => g.id),
        ];
      }
    }

    if (role === UserRole.PLAYER) {
      const player = await this.playersRepository.findOne({
        where: { user: { id: userId } },
        relations: ['group'],
      });
      if (player?.group) {
        groupIds = [player.group.id];
      }
    }

    if (role === UserRole.PARENT) {
      const parent = await this.parentsRepository.findOne({
        where: { user: { id: userId } },
        relations: ['children', 'children.group'],
      });
      if (parent?.children) {
        groupIds = parent.children
          .filter((child) => child.group)
          .map((child) => child.group.id);
      }
    }

    if (groupIds.length === 0) {
      return [];
    }

    return await this.trainingsRepository.find({
      where: { group: { id: In(groupIds) } },
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }
}
