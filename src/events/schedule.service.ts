import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan, IsNull, Not } from 'typeorm';
import { TrainingSchedule } from './entities/training-schedule.entity';
import { Training } from './entities/training.entity';
import { Group } from '../groups/entities/group.entity';
import { UpdateScheduleDto, GenerateTrainingsDto } from './dto/schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(TrainingSchedule)
    private scheduleRepository: Repository<TrainingSchedule>,
    @InjectRepository(Training)
    private trainingRepository: Repository<Training>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    private dataSource: DataSource,
  ) {}

  async getSchedule(groupId: string): Promise<TrainingSchedule[]> {
    await this.validateGroup(groupId);
    return this.scheduleRepository.find({
      where: { group: { id: groupId } },
      order: { dayOfWeek: 'ASC' },
    });
  }

  async updateSchedule(
    groupId: string,
    dto: UpdateScheduleDto,
  ): Promise<TrainingSchedule[]> {
    const group = await this.validateGroup(groupId);

    // Validate each item
    for (const item of dto.items) {
      if (item.endTime <= item.startTime) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    // Check for duplicate days
    const days = dto.items.map((i) => i.dayOfWeek);
    if (new Set(days).size !== days.length) {
      throw new BadRequestException('Duplicate days in schedule');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete existing schedule items
      await queryRunner.manager.delete(TrainingSchedule, {
        group: { id: groupId },
      });

      // Create new schedule items
      const schedules = dto.items.map((item) =>
        queryRunner.manager.create(TrainingSchedule, { ...item, group }),
      );

      const saved = await queryRunner.manager.save(schedules);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async generateTrainings(
    groupId: string,
    dto: GenerateTrainingsDto,
  ): Promise<{ created: number; skipped: number }> {
    const schedule = await this.getSchedule(groupId);
    if (schedule.length === 0) {
      throw new BadRequestException('No schedule defined for this group');
    }

    const group = await this.validateGroup(groupId);
    const fromDate = new Date(dto.fromDate);
    const toDate = new Date(dto.toDate);

    if (toDate < fromDate) {
      throw new BadRequestException('toDate must be after fromDate');
    }

    // Get existing trainings in date range to avoid duplicates
    const existingTrainings = await this.trainingRepository
      .createQueryBuilder('t')
      .where('t.groupId = :groupId', { groupId })
      .andWhere('DATE(t.startTime) >= :fromDate', {
        fromDate: dto.fromDate,
      })
      .andWhere('DATE(t.startTime) <= :toDate', {
        toDate: dto.toDate,
      })
      .getMany();

    const existingDates = new Set(
      existingTrainings.map((t) => t.startTime.toISOString().split('T')[0]),
    );

    const trainingsToCreate: Partial<Training>[] = [];
    let skipped = 0;

    // Create schedule map by dayOfWeek for quick lookup
    const scheduleMap = new Map<number, TrainingSchedule>();
    for (const item of schedule) {
      scheduleMap.set(item.dayOfWeek, item);
    }

    // Iterate through each day in range
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const dayOfWeek = currentDate.getDay();
      const scheduleItem = scheduleMap.get(dayOfWeek);

      if (scheduleItem) {
        const dateStr = currentDate.toISOString().split('T')[0];

        if (existingDates.has(dateStr)) {
          skipped++;
        } else {
          // Create training for this day
          const [startHour, startMin] = scheduleItem.startTime
            .split(':')
            .map(Number);
          const [endHour, endMin] = scheduleItem.endTime.split(':').map(Number);

          const startTime = new Date(currentDate);
          startTime.setHours(startHour, startMin, 0, 0);

          const endTime = new Date(currentDate);
          endTime.setHours(endHour, endMin, 0, 0);

          trainingsToCreate.push({
            startTime,
            endTime,
            location: scheduleItem.location,
            topic: dto.defaultTopic,
            group,
            schedule: scheduleItem,
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Bulk insert trainings
    if (trainingsToCreate.length > 0) {
      await this.trainingRepository.save(trainingsToCreate);
    }

    return {
      created: trainingsToCreate.length,
      skipped,
    };
  }

  async deleteFutureGeneratedTrainings(
    groupId: string,
  ): Promise<{ deleted: number; kept: number }> {
    await this.validateGroup(groupId);
    const now = new Date();

    // Find future trainings that were generated from schedule
    const futureTrainings = await this.trainingRepository.find({
      where: {
        group: { id: groupId },
        schedule: Not(IsNull()),
        startTime: MoreThan(now),
      },
      relations: ['attendances'],
    });

    const toDelete: string[] = [];
    let kept = 0;

    for (const training of futureTrainings) {
      if (training.attendances.length === 0) {
        toDelete.push(training.id);
      } else {
        kept++;
      }
    }

    if (toDelete.length > 0) {
      await this.trainingRepository.delete(toDelete);
    }

    return { deleted: toDelete.length, kept };
  }

  private async validateGroup(groupId: string): Promise<Group> {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }
    return group;
  }
}
