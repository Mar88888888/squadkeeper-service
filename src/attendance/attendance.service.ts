import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Player } from '../players/entities/player.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import {
  MarkAttendanceBatchDto,
  EventType,
} from './dto/mark-attendance-batch.dto';
import { AttendanceRecordDto } from './dto/attendance-record.dto';
import { AttendanceStatus } from './enums/attendance-status.enum';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(Training)
    private trainingsRepository: Repository<Training>,
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    private dataSource: DataSource,
  ) {}

  async markBatch(dto: MarkAttendanceBatchDto): Promise<Attendance[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the event (Training or Match)
      if (dto.eventType === EventType.TRAINING) {
        const training = await queryRunner.manager.findOne(Training, {
          where: { id: dto.eventId },
        });
        if (!training) {
          throw new NotFoundException(
            `Training with ID ${dto.eventId} not found`,
          );
        }
      } else {
        const match = await queryRunner.manager.findOne(Match, {
          where: { id: dto.eventId },
        });
        if (!match) {
          throw new NotFoundException(`Match with ID ${dto.eventId} not found`);
        }
      }

      const results: Attendance[] = [];

      // Process each record
      for (const record of dto.records) {
        const attendance = await this.upsertAttendance(
          queryRunner,
          record,
          dto.eventType,
          dto.eventId,
        );
        results.push(attendance);
      }

      await queryRunner.commitTransaction();
      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to mark attendance');
    } finally {
      await queryRunner.release();
    }
  }

  private async upsertAttendance(
    queryRunner: any,
    record: AttendanceRecordDto,
    eventType: EventType,
    eventId: string,
  ): Promise<Attendance> {
    // Find player
    const player = await queryRunner.manager.findOne(Player, {
      where: { id: record.playerId },
    });
    if (!player) {
      throw new NotFoundException(
        `Player with ID ${record.playerId} not found`,
      );
    }

    // Check if attendance already exists
    const existingAttendance = await queryRunner.manager.findOne(Attendance, {
      where: {
        player: { id: record.playerId },
        ...(eventType === EventType.TRAINING
          ? { training: { id: eventId } }
          : { match: { id: eventId } }),
      },
      relations: ['player', 'training', 'match'],
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = record.status;
      existingAttendance.notes = record.notes || null;
      const savedAttendance = await queryRunner.manager.save(existingAttendance);

      // If status changed to not present (not PRESENT or LATE), delete evaluations for this training
      if (
        eventType === EventType.TRAINING &&
        record.status !== AttendanceStatus.PRESENT &&
        record.status !== AttendanceStatus.LATE
      ) {
        await queryRunner.manager.delete(Evaluation, {
          player: { id: record.playerId },
          training: { id: eventId },
        });
      }

      return savedAttendance;
    } else {
      // Create new attendance
      const attendanceData: Partial<Attendance> = {
        player,
        status: record.status,
        notes: record.notes || null,
      };

      if (eventType === EventType.TRAINING) {
        attendanceData.training = await queryRunner.manager.findOne(Training, {
          where: { id: eventId },
        });
        attendanceData.match = null;
      } else {
        attendanceData.match = await queryRunner.manager.findOne(Match, {
          where: { id: eventId },
        });
        attendanceData.training = null;
      }

      const attendance = queryRunner.manager.create(Attendance, attendanceData);
      return await queryRunner.manager.save(attendance);
    }
  }

  async findByEvent(
    eventId: string,
    eventType: EventType,
  ): Promise<Attendance[]> {
    const whereCondition =
      eventType === EventType.TRAINING
        ? { training: { id: eventId } }
        : { match: { id: eventId } };

    return await this.attendanceRepository.find({
      where: whereCondition,
      relations: ['player', 'training', 'match'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByEventForPlayers(
    eventId: string,
    eventType: EventType,
    playerIds: string[],
  ): Promise<Attendance[]> {
    const allAttendance = await this.findByEvent(eventId, eventType);
    return allAttendance.filter((a) => playerIds.includes(a.player.id));
  }

  async getPlayerStats(playerIds: string[]): Promise<{
    total: number;
    present: number;
    absent: number;
    late: number;
    sick: number;
    excused: number;
    rate: number;
    totalTrainings: number;
    totalMatches: number;
  }> {
    const attendances = await this.attendanceRepository.find({
      where: playerIds.map((id) => ({ player: { id } })),
      relations: ['training', 'match'],
    });

    const stats = {
      total: attendances.length,
      present: 0,
      absent: 0,
      late: 0,
      sick: 0,
      excused: 0,
      rate: 0,
      totalTrainings: 0,
      totalMatches: 0,
    };

    attendances.forEach((a) => {
      // Count by event type
      if (a.training) {
        stats.totalTrainings++;
      } else if (a.match) {
        stats.totalMatches++;
      }

      switch (a.status) {
        case AttendanceStatus.PRESENT:
          stats.present++;
          break;
        case AttendanceStatus.ABSENT:
          stats.absent++;
          break;
        case AttendanceStatus.LATE:
          stats.late++;
          break;
        case AttendanceStatus.SICK:
          stats.sick++;
          break;
        case AttendanceStatus.EXCUSED:
          stats.excused++;
          break;
      }
    });

    // Calculate rate: (present + late) / total * 100
    if (stats.total > 0) {
      stats.rate = Math.round(((stats.present + stats.late) / stats.total) * 100);
    }

    return stats;
  }

  async getStatsPerPlayer(
    players: { id: string; firstName: string; lastName: string }[],
  ): Promise<
    Array<{
      playerId: string;
      playerName: string;
      total: number;
      present: number;
      absent: number;
      late: number;
      sick: number;
      excused: number;
      rate: number;
      totalTrainings: number;
      totalMatches: number;
    }>
  > {
    const result: Array<{
      playerId: string;
      playerName: string;
      total: number;
      present: number;
      absent: number;
      late: number;
      sick: number;
      excused: number;
      rate: number;
      totalTrainings: number;
      totalMatches: number;
    }> = [];

    for (const player of players) {
      const attendances = await this.attendanceRepository.find({
        where: { player: { id: player.id } },
        relations: ['training', 'match'],
      });

      const stats = {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        total: attendances.length,
        present: 0,
        absent: 0,
        late: 0,
        sick: 0,
        excused: 0,
        rate: 0,
        totalTrainings: 0,
        totalMatches: 0,
      };

      attendances.forEach((a) => {
        // Count by event type
        if (a.training) {
          stats.totalTrainings++;
        } else if (a.match) {
          stats.totalMatches++;
        }

        switch (a.status) {
          case AttendanceStatus.PRESENT:
            stats.present++;
            break;
          case AttendanceStatus.ABSENT:
            stats.absent++;
            break;
          case AttendanceStatus.LATE:
            stats.late++;
            break;
          case AttendanceStatus.SICK:
            stats.sick++;
            break;
          case AttendanceStatus.EXCUSED:
            stats.excused++;
            break;
        }
      });

      if (stats.total > 0) {
        stats.rate = Math.round(
          ((stats.present + stats.late) / stats.total) * 100,
        );
      }

      result.push(stats);
    }

    return result;
  }
}
