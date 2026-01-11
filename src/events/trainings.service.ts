import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { Training } from './entities/training.entity';
import { Group } from '../groups/entities/group.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { CreateTrainingDto } from './dto/create-training.dto';
import { FilterTrainingsDto } from './dto/filter-trainings.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { buildDateFilter } from '../common/utils/date-filter.util';

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
    const group = await this.groupsRepository.findOne({
      where: { id: createTrainingDto.groupId },
    });

    if (!group) {
      throw new NotFoundException(
        `Group with id ${createTrainingDto.groupId} not found`,
      );
    }

    if (createTrainingDto.endTime <= createTrainingDto.startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const training = this.trainingsRepository.create({
      ...createTrainingDto,
      group,
    });

    return await this.trainingsRepository.save(training);
  }

  async findAll(filters: FilterTrainingsDto = {}): Promise<Training[]> {
    const dateFilter = buildDateFilter(filters);

    return await this.trainingsRepository.find({
      where: dateFilter,
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }

  async findByGroup(groupId: string): Promise<Training[]> {
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

  async findOneForUser(
    id: string,
    userId: string,
    role: UserRole,
  ): Promise<Training & { group: Group & { players: Player[] } }> {
    const training = await this.findOne(id);

    if (role === UserRole.ADMIN || role === UserRole.COACH) {
      if (role === UserRole.COACH) {
        const coach = await this.coachesRepository.findOne({
          where: { user: { id: userId } },
          relations: ['headGroups', 'assistantGroups'],
        });
        const coachGroupIds = [
          ...(coach?.headGroups?.map((g) => g.id) || []),
          ...(coach?.assistantGroups?.map((g) => g.id) || []),
        ];
        if (!coachGroupIds.includes(training.group.id)) {
          throw new ForbiddenException('You do not have access to this training');
        }
      }
      return training;
    }

    if (role === UserRole.PLAYER) {
      const player = await this.playersRepository.findOne({
        where: { user: { id: userId } },
        relations: ['group'],
      });
      if (!player || player.group?.id !== training.group.id) {
        throw new ForbiddenException('You do not have access to this training');
      }
      training.group.players = training.group.players.filter((p) => p.id === player.id);
      return training;
    }

    if (role === UserRole.PARENT) {
      const parent = await this.parentsRepository.findOne({
        where: { user: { id: userId } },
        relations: ['children', 'children.group'],
      });
      const childrenInGroup = parent?.children?.filter(
        (child) => child.group?.id === training.group.id,
      ) || [];
      if (childrenInGroup.length === 0) {
        throw new ForbiddenException('You do not have access to this training');
      }
      const childIds = childrenInGroup.map((c) => c.id);
      training.group.players = training.group.players.filter((p) => childIds.includes(p.id));
      return training;
    }

    throw new ForbiddenException('You do not have access to this training');
  }

  async findMyTrainings(
    userId: string,
    role: UserRole,
    filters: FilterTrainingsDto = {},
  ): Promise<Training[]> {
    let groupIds: string[] = [];

    if (role === UserRole.ADMIN) {
      return this.findAll(filters);
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

    const dateFilter = buildDateFilter(filters);
    const whereCondition: FindOptionsWhere<Training> = {
      group: { id: In(groupIds) },
      ...dateFilter,
    };

    return await this.trainingsRepository.find({
      where: whereCondition,
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }
}
