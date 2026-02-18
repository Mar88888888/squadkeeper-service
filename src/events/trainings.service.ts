import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Training } from './entities/training.entity';
import { Group } from '../groups/entities/group.entity';
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

  async findOne(id: string): Promise<Training> {
    const training = await this.trainingsRepository.findOne({
      where: { id },
      relations: ['group', 'group.players'],
    });

    if (!training) {
      throw new NotFoundException(`Training with id ${id} not found`);
    }

    return training;
  }

  async findMyTrainings(
    groupIds: string[],
    role: UserRole,
    filters: FilterTrainingsDto = {},
  ): Promise<Training[]> {
    if (role === UserRole.ADMIN) {
      return this.findAll(filters);
    }
    if (groupIds.length === 0) return [];

    const dateFilter = buildDateFilter(filters);

    return await this.trainingsRepository.find({
      where: {
        group: { id: In(groupIds) },
        ...dateFilter,
      },
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }
}
