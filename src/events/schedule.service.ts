import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TrainingSchedule } from './entities/training-schedule.entity';
import { Training } from './entities/training.entity';
import { Group } from '../groups/entities/group.entity';
import { GroupsService } from '../groups/groups.service';
import { ApplyScheduleDto } from './dto/schedule.dto';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(TrainingSchedule)
    private scheduleRepository: Repository<TrainingSchedule>,
    @InjectRepository(Training)
    private trainingRepository: Repository<Training>,
    private groupsService: GroupsService,
    private dataSource: DataSource,
  ) {}

  async getSchedule(groupId: string): Promise<TrainingSchedule[]> {
    await this.validateGroup(groupId);
    return this.scheduleRepository.find({
      where: { group: { id: groupId } },
      order: { dayOfWeek: 'ASC' },
    });
  }

  async getTrainingsInRange(
    groupId: string,
    fromDate: string,
    toDate: string,
  ): Promise<{ total: number; withAttendance: number }> {
    await this.validateGroup(groupId);

    const trainings = await this.trainingRepository
      .createQueryBuilder('t')
      .leftJoin('t.attendances', 'a')
      .where('t.groupId = :groupId', { groupId })
      .andWhere('DATE(t.startTime) >= :fromDate', { fromDate })
      .andWhere('DATE(t.startTime) <= :toDate', { toDate })
      .select('t.id')
      .addSelect('COUNT(a.id)', 'attendanceCount')
      .groupBy('t.id')
      .getRawMany();

    const total = trainings.length;
    const withAttendance = trainings.filter(
      (t) => parseInt(t.attendanceCount) > 0,
    ).length;

    return { total, withAttendance };
  }

  async applySchedule(
    groupId: string,
    dto: ApplyScheduleDto,
  ): Promise<{ deleted: number; created: number }> {
    const group = await this.validateGroup(groupId);

    // Validate date range
    const fromDate = new Date(dto.fromDate);
    const toDate = new Date(dto.toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (fromDate < today) {
      throw new BadRequestException('Cannot apply schedule to past dates');
    }

    if (toDate < fromDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (toDate.getTime() - fromDate.getTime() > ONE_YEAR_MS) {
      throw new BadRequestException('Date range cannot exceed 1 year');
    }

    // Validate no duplicate days
    const days = dto.items.map((i) => i.dayOfWeek);
    if (new Set(days).size !== days.length) {
      throw new BadRequestException('Duplicate days in schedule');
    }

    return this.dataSource.transaction(async (manager) => {
      // Count and delete existing trainings in the date range
      const existingTrainings = await manager
        .createQueryBuilder(Training, 't')
        .where('t.groupId = :groupId', { groupId })
        .andWhere('DATE(t.startTime) >= :fromDate', { fromDate: dto.fromDate })
        .andWhere('DATE(t.startTime) <= :toDate', { toDate: dto.toDate })
        .getMany();

      const deletedCount = existingTrainings.length;

      if (deletedCount > 0) {
        await manager.delete(
          Training,
          existingTrainings.map((t) => t.id),
        );
      }

      // Delete old schedule template and save new one
      await manager.delete(TrainingSchedule, { group: { id: groupId } });

      const schedules = dto.items.map((item) =>
        manager.create(TrainingSchedule, { ...item, group }),
      );
      const savedSchedules = await manager.save(schedules);

      // Build schedule map for generation
      const scheduleMap = new Map<number, TrainingSchedule>();
      for (const item of savedSchedules) {
        scheduleMap.set(item.dayOfWeek, item);
      }

      const trainingsToCreate: Partial<Training>[] = [];
      const currentDate = new Date(fromDate);

      while (currentDate <= toDate) {
        const dayOfWeek = currentDate.getDay();
        const scheduleItem = scheduleMap.get(dayOfWeek);

        if (scheduleItem) {
          const [startHour, startMin] = scheduleItem.startTime
            .split(':')
            .map(Number);

          const startTime = new Date(currentDate);
          startTime.setHours(startHour, startMin, 0, 0);

          trainingsToCreate.push({
            startTime,
            durationMinutes: scheduleItem.durationMinutes,
            location: scheduleItem.location,
            topic: dto.defaultTopic,
            group,
            schedule: scheduleItem,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (trainingsToCreate.length > 0) {
        await manager.save(Training, trainingsToCreate);
      }

      return {
        deleted: deletedCount,
        created: trainingsToCreate.length,
      };
    });
  }

  private async validateGroup(groupId: string): Promise<Group> {
    return this.groupsService.findOne(groupId);
  }
}
