import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere, ILike } from 'typeorm';
import { Training } from './entities/training.entity';
import { GroupsService } from '../groups/groups.service';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { FilterTrainingsDto } from './dto/filter-trainings.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { buildDateFilter } from './utils/date-filter.util';
import { TimeFilter } from './enums/time-filter.enum';

@Injectable()
export class TrainingsService {
  private readonly logger = new Logger(TrainingsService.name);

  private getSortDirection(filters: FilterTrainingsDto): 'ASC' | 'DESC' {
    return filters.timeFilter === TimeFilter.PAST ? 'DESC' : 'ASC';
  }

  constructor(
    @InjectRepository(Training)
    private trainingsRepository: Repository<Training>,
    private groupsService: GroupsService,
  ) {}

  private buildWhere(
    filters: FilterTrainingsDto,
    groupIds?: string[],
  ): FindOptionsWhere<Training> | FindOptionsWhere<Training>[] {
    const dateFilter = buildDateFilter(filters);
    const groupWhere =
      filters.groupId
        ? { id: filters.groupId }
        : groupIds
          ? { id: In(groupIds) }
          : undefined;
    const base: FindOptionsWhere<Training> = {
      ...(dateFilter ?? {}),
      ...(groupWhere ? { group: groupWhere } : {}),
    };

    if (!filters.search?.trim()) {
      return base;
    }

    const search = `%${filters.search.trim()}%`;
    return [
      { ...base, topic: ILike(search) },
      { ...base, location: ILike(search) },
      { ...base, group: { ...(groupWhere ?? {}), name: ILike(search) } },
    ];
  }

  async create(createTrainingDto: CreateTrainingDto): Promise<Training> {
    const group = await this.groupsService.findOne(createTrainingDto.groupId);

    const training = this.trainingsRepository.create({
      ...createTrainingDto,
      group,
    });

    const saved = await this.trainingsRepository.save(training);
    this.logger.log(`Training created: ${saved.id} for group ${group.id}`);
    return saved;
  }

  async findAll(
    filters: FilterTrainingsDto = {},
  ): Promise<{ items: Training[]; total: number }> {
    const sortDirection = this.getSortDirection(filters);
    const where = this.buildWhere(filters);

    const [items, total] = await this.trainingsRepository.findAndCount({
      where,
      relations: ['group'],
      order: { startTime: sortDirection },
      skip: filters.skip,
      take: filters.take,
    });
    return { items, total };
  }

  async findByGroup(groupId: string): Promise<Training[]> {
    await this.groupsService.findOne(groupId);

    return this.trainingsRepository.find({
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
  ): Promise<{ items: Training[]; total: number }> {
    if (role === UserRole.ADMIN) {
      return this.findAll(filters);
    }
    if (groupIds.length === 0) return { items: [], total: 0 };
    const sortDirection = this.getSortDirection(filters);
    const where = this.buildWhere(filters, groupIds);

    const [items, total] = await this.trainingsRepository.findAndCount({
      where,
      relations: ['group'],
      order: { startTime: sortDirection },
      skip: filters.skip,
      take: filters.take,
    });
    return { items, total };
  }

  async update(
    id: string,
    updateTrainingDto: UpdateTrainingDto,
  ): Promise<Training> {
    const training = await this.findOne(id);

    if (
      updateTrainingDto.groupId &&
      updateTrainingDto.groupId !== training.group.id
    ) {
      training.group = await this.groupsService.findOne(
        updateTrainingDto.groupId,
      );
    }

    Object.assign(training, {
      startTime: updateTrainingDto.startTime ?? training.startTime,
      durationMinutes:
        updateTrainingDto.durationMinutes ?? training.durationMinutes,
      location: updateTrainingDto.location ?? training.location,
      topic:
        updateTrainingDto.topic !== undefined
          ? updateTrainingDto.topic
          : training.topic,
    });

    const saved = await this.trainingsRepository.save(training);
    this.logger.log(`Training updated: ${saved.id}`);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const training = await this.trainingsRepository.findOne({
      where: { id },
    });

    if (training) {
      await this.trainingsRepository.remove(training);
      this.logger.log(`Training deleted: ${id}`);
    }
  }
}
