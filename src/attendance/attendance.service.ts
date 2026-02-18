import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
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

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    private dataSource: DataSource,
  ) {}

  async markBatch(dto: MarkAttendanceBatchDto): Promise<Attendance[]> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        if (dto.eventType === EventType.TRAINING) {
          const training = await manager.findOne(Training, {
            where: { id: dto.eventId },
          });
          if (!training) {
            throw new NotFoundException(
              `Training with ID ${dto.eventId} not found`,
            );
          }
        } else {
          const match = await manager.findOne(Match, {
            where: { id: dto.eventId },
          });
          if (!match) {
            throw new NotFoundException(
              `Match with ID ${dto.eventId} not found`,
            );
          }
        }

        const results: Attendance[] = [];

        for (const record of dto.records) {
          const attendance = await this.upsertAttendance(
            manager,
            record,
            dto.eventType,
            dto.eventId,
          );
          results.push(attendance);
        }

        return results;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to mark attendance', error);
      throw new BadRequestException('Failed to mark attendance');
    }
  }

  private async upsertAttendance(
    manager: EntityManager,
    record: AttendanceRecordDto,
    eventType: EventType,
    eventId: string,
  ): Promise<Attendance> {
    const player = await manager.findOne(Player, {
      where: { id: record.playerId },
    });
    if (!player) {
      throw new NotFoundException(
        `Player with ID ${record.playerId} not found`,
      );
    }

    const existingAttendance = await manager.findOne(Attendance, {
      where: {
        player: { id: record.playerId },
        ...(eventType === EventType.TRAINING
          ? { training: { id: eventId } }
          : { match: { id: eventId } }),
      },
      relations: ['player', 'training', 'match'],
    });

    if (existingAttendance) {
      existingAttendance.isPresent = record.isPresent;
      existingAttendance.notes = record.notes || null;
      const savedAttendance = await manager.save(existingAttendance);

      // Delete evaluation if player is marked absent
      if (!record.isPresent) {
        if (eventType === EventType.TRAINING) {
          await manager.delete(Evaluation, {
            player: { id: record.playerId },
            training: { id: eventId },
          });
        } else {
          await manager.delete(Evaluation, {
            player: { id: record.playerId },
            match: { id: eventId },
          });
        }
      }

      return savedAttendance;
    } else {
      const attendanceData: Partial<Attendance> = {
        player,
        isPresent: record.isPresent,
        notes: record.notes || null,
      };

      if (eventType === EventType.TRAINING) {
        attendanceData.training = await manager.findOne(Training, {
          where: { id: eventId },
        });
        attendanceData.match = null;
      } else {
        attendanceData.match = await manager.findOne(Match, {
          where: { id: eventId },
        });
        attendanceData.training = null;
      }

      const attendance = manager.create(Attendance, attendanceData);
      return await manager.save(attendance);
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
      rate: 0,
      totalTrainings: 0,
      totalMatches: 0,
    };

    attendances.forEach((a) => {
      if (a.training) {
        stats.totalTrainings++;
      } else if (a.match) {
        stats.totalMatches++;
      }

      if (a.isPresent) {
        stats.present++;
      } else {
        stats.absent++;
      }
    });

    if (stats.total > 0) {
      stats.rate = Math.round((stats.present / stats.total) * 100);
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
        rate: 0,
        totalTrainings: 0,
        totalMatches: 0,
      };

      attendances.forEach((a) => {
        if (a.training) {
          stats.totalTrainings++;
        } else if (a.match) {
          stats.totalMatches++;
        }

        if (a.isPresent) {
          stats.present++;
        } else {
          stats.absent++;
        }
      });

      if (stats.total > 0) {
        stats.rate = Math.round((stats.present / stats.total) * 100);
      }

      result.push(stats);
    }

    return result;
  }
}
