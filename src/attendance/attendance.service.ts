import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Player } from '../players/entities/player.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { MarkAttendanceBatchDto } from './dto/mark-attendance-batch.dto';
import { EventType } from '../events/enums/event-type.enum';
import { AttendanceRecordDto } from './dto/attendance-record.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { ChildInfo } from '../auth/dto/authenticated-user.dto';
import { calculateAttendanceRate } from './utils/attendance-rate.util';
import { AttendanceStats } from './interfaces/attendance-stats.interface';

export interface PlayerAttendanceStats extends AttendanceStats {
  playerId: string;
  playerName: string;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Training)
    private trainingsRepository: Repository<Training>,
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    private dataSource: DataSource,
  ) {}

  async markBatch(dto: MarkAttendanceBatchDto): Promise<Attendance[]> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const event =
          dto.eventType === EventType.TRAINING
            ? await manager.findOne(Training, { where: { id: dto.eventId } })
            : await manager.findOne(Match, { where: { id: dto.eventId } });

        if (!event) {
          throw new NotFoundException(
            `${dto.eventType === EventType.TRAINING ? 'Training' : 'Match'} with ID ${dto.eventId} not found`,
          );
        }

        const results: Attendance[] = [];

        for (const record of dto.records) {
          const attendance = await this.upsertAttendance(
            manager,
            record,
            dto.eventType,
            event,
          );
          results.push(attendance);
        }

        this.logger.log(
          `Marked attendance for ${results.length} players on ${dto.eventType} ${dto.eventId}`,
        );

        return results;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to mark attendance', error);
      throw new BadRequestException(`Failed to mark attendance: ${error.message}`);
    }
  }

  private async upsertAttendance(
    manager: EntityManager,
    record: AttendanceRecordDto,
    eventType: EventType,
    event: Training | Match,
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
          ? { training: { id: event.id } }
          : { match: { id: event.id } }),
      },
      relations: ['player', 'training', 'match'],
    });

    if (existingAttendance) {
      existingAttendance.isPresent = record.isPresent;
      existingAttendance.notes = record.notes || null;
      const savedAttendance = await manager.save(existingAttendance);

      // Delete evaluation if player is marked absent
      if (!record.isPresent) {
        const deleteResult =
          eventType === EventType.TRAINING
            ? await manager.delete(Evaluation, {
                player: { id: record.playerId },
                training: { id: event.id },
              })
            : await manager.delete(Evaluation, {
                player: { id: record.playerId },
                match: { id: event.id },
              });

        if (deleteResult.affected) {
          this.logger.log(
            `Deleted evaluation for absent player ${record.playerId} on ${eventType} ${event.id}`,
          );
        }
      }

      return savedAttendance;
    } else {
      const attendanceData: Partial<Attendance> = {
        player,
        isPresent: record.isPresent,
        notes: record.notes || null,
        training: eventType === EventType.TRAINING ? (event as Training) : null,
        match: eventType === EventType.MATCH ? (event as Match) : null,
      };

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

  async getPlayerStats(playerIds: string[]): Promise<AttendanceStats> {
    const attendances = await this.attendanceRepository.find({
      where: playerIds.map((id) => ({ player: { id } })),
      relations: ['training', 'match'],
    });

    return this.calculateStats(attendances);
  }

  async getStatsPerPlayer(
    playerIds: string[],
  ): Promise<Array<PlayerAttendanceStats>> {
    const allAttendances = await this.attendanceRepository.find({
      where: { player: { id: In(playerIds) } },
      relations: ['player', 'training', 'match'],
    });

    const attendancesByPlayer = new Map<
      string,
      { player: Player; attendances: Attendance[] }
    >();
    for (const attendance of allAttendances) {
      const playerId = attendance.player.id;
      if (!attendancesByPlayer.has(playerId)) {
        attendancesByPlayer.set(playerId, {
          player: attendance.player,
          attendances: [],
        });
      }
      attendancesByPlayer.get(playerId)!.attendances.push(attendance);
    }

    return Array.from(attendancesByPlayer.values()).map(
      ({ player, attendances }) => ({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        ...this.calculateStats(attendances),
      }),
    );
  }

  async wasPlayerPresent(matchId: string, playerId: string): Promise<boolean> {
    const attendance = await this.attendanceRepository.findOne({
      where: {
        player: { id: playerId },
        match: { id: matchId },
      },
    });

    return attendance?.isPresent ?? false;
  }

  async getEventAttendanceForUser(
    eventId: string,
    eventType: EventType,
    role: UserRole,
    groupIds: string[],
    playerId?: string,
    children?: ChildInfo[],
  ): Promise<Attendance[]> {
    if (role === UserRole.ADMIN || role === UserRole.COACH) {
      return this.findByEvent(eventId, eventType);
    }

    const event = await this.findEvent(eventId, eventType);
    const eventGroupId = event.group.id;

    if (!groupIds.includes(eventGroupId)) {
      throw new ForbiddenException(
        `You do not have access to this ${eventType.toLowerCase()}`,
      );
    }

    if (role === UserRole.PLAYER && playerId) {
      return this.findByEventForPlayers(eventId, eventType, [playerId]);
    }

    if (role === UserRole.PARENT && children) {
      const childrenInGroup = children.filter(
        (child) => child.groupId === eventGroupId,
      );
      const childIds = childrenInGroup.map((c) => c.id);
      return this.findByEventForPlayers(eventId, eventType, childIds);
    }

    throw new ForbiddenException('Access denied');
  }

  private calculateStats(attendances: Attendance[]): AttendanceStats {
    const stats: AttendanceStats = {
      total: attendances.length,
      present: 0,
      absent: 0,
      rate: 0,
      totalTrainings: 0,
      totalMatches: 0,
    };

    for (const attendance of attendances) {
      if (attendance.training) {
        stats.totalTrainings++;
      } else if (attendance.match) {
        stats.totalMatches++;
      }

      if (attendance.isPresent) {
        stats.present++;
      } else {
        stats.absent++;
      }
    }

    calculateAttendanceRate(stats);

    return stats;
  }

  private async findEvent(
    eventId: string,
    eventType: EventType,
  ): Promise<Training | Match> {
    const event =
      eventType === EventType.TRAINING
        ? await this.trainingsRepository.findOne({
            where: { id: eventId },
            relations: ['group'],
          })
        : await this.matchesRepository.findOne({
            where: { id: eventId },
            relations: ['group'],
          });

    if (!event) {
      throw new NotFoundException(
        `${eventType === EventType.TRAINING ? 'Training' : 'Match'} not found`,
      );
    }

    return event;
  }
}
