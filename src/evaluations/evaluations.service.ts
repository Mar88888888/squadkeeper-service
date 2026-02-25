import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { Player } from '../players/entities/player.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { PlayersService } from '../players/players.service';
import { ParentsService } from '../parents/parents.service';
import { TrainingsService } from '../events/trainings.service';
import { MatchesService } from '../events/matches.service';

import { UserRole } from '../users/enums/user-role.enum';
import { CreateEvaluationBatchDto } from './dto/create-evaluation-batch.dto';
import { EventType } from '../events/enums/event-type.enum';
import { StatsPeriod } from '../common/enums/stats-period.enum';
import { getDateRangeForPeriod } from '../common/utils/date-range.util';

const DEFAULT_RATING = 5;

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    private playersService: PlayersService,
    private parentsService: ParentsService,
    private trainingsService: TrainingsService,
    private matchesService: MatchesService,
    private dataSource: DataSource,
  ) {}

  async createBatch(
    dto: CreateEvaluationBatchDto,
    coachUserId: string,
  ): Promise<Evaluation[]> {
    if (!dto.trainingId && !dto.matchId) {
      throw new BadRequestException('Either trainingId or matchId is required');
    }
    if (dto.trainingId && dto.matchId) {
      throw new BadRequestException(
        'Cannot specify both trainingId and matchId',
      );
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        let training: Training | null = null;
        let match: Match | null = null;

        if (dto.trainingId) {
          training = await manager.findOne(Training, {
            where: { id: dto.trainingId },
            relations: ['group', 'group.headCoach', 'group.assistants'],
          });
          if (!training) {
            throw new NotFoundException(
              `Training with ID ${dto.trainingId} not found`,
            );
          }
        }

        if (dto.matchId) {
          match = await manager.findOne(Match, {
            where: { id: dto.matchId },
            relations: ['group', 'group.headCoach', 'group.assistants'],
          });
          if (!match) {
            throw new NotFoundException(
              `Match with ID ${dto.matchId} not found`,
            );
          }
        }

        const coach = await manager.findOne(Coach, {
          where: { user: { id: coachUserId } },
        });
        if (!coach) {
          throw new BadRequestException(
            'Only coaches can create evaluations. Admin users need a coach profile to evaluate players.',
          );
        }

        const group = training?.group || match?.group;
        const isHeadCoach = group?.headCoach?.id === coach.id;
        const isAssistant = group?.assistants?.some((a) => a.id === coach.id);
        if (!isHeadCoach && !isAssistant) {
          throw new ForbiddenException(
            'You can only create evaluations for groups you are assigned to',
          );
        }

        const playerIds = dto.records.map((r) => r.playerId);

        // Batch fetch all players
        const players = await manager.find(Player, {
          where: { id: In(playerIds) },
        });
        const playersMap = new Map(players.map((p) => [p.id, p]));

        // Batch fetch all attendances for this event
        const attendanceWhere: FindOptionsWhere<Attendance> = {
          player: { id: In(playerIds) },
        };
        if (training) attendanceWhere.training = { id: training.id };
        if (match) attendanceWhere.match = { id: match.id };

        const attendances = await manager.find(Attendance, {
          where: attendanceWhere,
          relations: ['player'],
        });
        const attendanceMap = new Map(attendances.map((a) => [a.player.id, a]));

        // Batch fetch existing evaluations
        const existingEvaluations = await manager.find(Evaluation, {
          where: {
            player: { id: In(playerIds) },
            training: training ? { id: training.id } : IsNull(),
            match: match ? { id: match.id } : IsNull(),
          },
          relations: ['player'],
        });
        const existingMap = new Map(
          existingEvaluations.map((e) => [e.player.id, e]),
        );

        // Process records using maps
        const evaluationsToSave: Evaluation[] = [];

        for (const record of dto.records) {
          const player = playersMap.get(record.playerId);
          if (!player) {
            throw new NotFoundException(
              `Player with ID ${record.playerId} not found`,
            );
          }

          const attendance = attendanceMap.get(record.playerId);
          if (!attendance || !attendance.isPresent) {
            throw new BadRequestException(
              `Cannot evaluate player ${player.firstName} ${player.lastName} - they did not play in this event`,
            );
          }

          const existing = existingMap.get(record.playerId);

          if (existing) {
            if (record.technical !== undefined)
              existing.technical = record.technical;
            if (record.tactical !== undefined)
              existing.tactical = record.tactical;
            if (record.physical !== undefined)
              existing.physical = record.physical;
            if (record.psychological !== undefined)
              existing.psychological = record.psychological;
            if (record.comment !== undefined)
              existing.comment = record.comment || null;
            existing.coach = coach;
            evaluationsToSave.push(existing);
          } else {
            const evaluation = manager.create(Evaluation, {
              player,
              training,
              match,
              coach,
              technical: record.technical ?? DEFAULT_RATING,
              tactical: record.tactical ?? DEFAULT_RATING,
              physical: record.physical ?? DEFAULT_RATING,
              psychological: record.psychological ?? DEFAULT_RATING,
              comment: record.comment || null,
            });
            evaluationsToSave.push(evaluation);
          }
        }

        // Batch save all evaluations
        return await manager.save(evaluationsToSave);
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to create evaluations', error);
      throw new BadRequestException(
        `Failed to create evaluations: ${error.message}`,
      );
    }
  }

  async findByTraining(trainingId: string): Promise<Evaluation[]> {
    await this.trainingsService.findOne(trainingId);
    return this.evaluationsRepository.find({
      where: { training: { id: trainingId } },
      relations: ['player', 'coach', 'training'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByMatch(matchId: string): Promise<Evaluation[]> {
    await this.matchesService.findOne(matchId);
    return this.evaluationsRepository.find({
      where: { match: { id: matchId } },
      relations: ['player', 'coach', 'match'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByPlayer(playerId: string): Promise<Evaluation[]> {
    return await this.evaluationsRepository.find({
      where: { player: { id: playerId } },
      relations: ['player', 'coach', 'training', 'match'],
      order: { createdAt: 'DESC' },
    });
  }

  async getRatingStats(
    playerId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ) {
    await this.playersService.findOne(playerId);

    const { start, end } = getDateRangeForPeriod(period);

    const query = this.evaluationsRepository
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.training', 't')
      .leftJoinAndSelect('e.match', 'm')
      .where('e.playerId = :playerId', { playerId })
      .orderBy('e.createdAt', 'ASC');

    if (start && end) {
      query.andWhere(
        '((t.startTime BETWEEN :start AND :end) OR (m.startTime BETWEEN :start AND :end))',
        { start, end },
      );
    }

    const evaluations = await query.getMany();

    const history: {
      date: string;
      eventType: EventType;
      eventId: string;
      averageRating: number;
      ratings: {
        technical: number | null;
        tactical: number | null;
        physical: number | null;
        psychological: number | null;
      };
    }[] = [];
    const categoryRatings: { [key: string]: number[] } = {
      technical: [],
      tactical: [],
      physical: [],
      psychological: [],
    };
    const allAverages: number[] = [];

    for (const evaluation of evaluations) {
      let eventDate: Date;
      let eventType: EventType;
      let eventId: string;

      if (evaluation.training) {
        eventDate = new Date(evaluation.training.startTime);
        eventType = EventType.TRAINING;
        eventId = evaluation.training.id;
      } else if (evaluation.match) {
        eventDate = new Date(evaluation.match.startTime);
        eventType = EventType.MATCH;
        eventId = evaluation.match.id;
      } else {
        continue;
      }

      const ratings = [
        evaluation.technical,
        evaluation.tactical,
        evaluation.physical,
        evaluation.psychological,
      ].filter((r): r is number => r !== null);

      const averageRating =
        ratings.length > 0
          ? Math.round(
              (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10,
            ) / 10
          : 0;

      allAverages.push(averageRating);

      if (evaluation.technical !== null)
        categoryRatings.technical.push(evaluation.technical);
      if (evaluation.tactical !== null)
        categoryRatings.tactical.push(evaluation.tactical);
      if (evaluation.physical !== null)
        categoryRatings.physical.push(evaluation.physical);
      if (evaluation.psychological !== null)
        categoryRatings.psychological.push(evaluation.psychological);

      history.push({
        date: eventDate.toISOString(),
        eventType,
        eventId,
        averageRating,
        ratings: {
          technical: evaluation.technical,
          tactical: evaluation.tactical,
          physical: evaluation.physical,
          psychological: evaluation.psychological,
        },
      });
    }

    const calculateAverage = (arr: number[]): number | null => {
      if (arr.length === 0) return null;
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      return Math.round(avg * 10) / 10;
    };

    return {
      averageRating: calculateAverage(allAverages),
      totalEvents: history.length,
      byCategory: {
        technical: calculateAverage(categoryRatings.technical),
        tactical: calculateAverage(categoryRatings.tactical),
        physical: calculateAverage(categoryRatings.physical),
        psychological: calculateAverage(categoryRatings.psychological),
      },
      history,
    };
  }

  async findByEventForUser(
    eventId: string,
    eventType: EventType,
    userId: string,
    role: UserRole,
  ): Promise<Evaluation[]> {
    if (role === UserRole.ADMIN || role === UserRole.COACH) {
      return eventType === EventType.TRAINING
        ? this.findByTraining(eventId)
        : this.findByMatch(eventId);
    }

    const eventLabel = eventType === EventType.TRAINING ? 'Training' : 'Match';
    const event =
      eventType === EventType.TRAINING
        ? await this.trainingsService.findOne(eventId)
        : await this.matchesService.findOne(eventId);

    const allEvaluations =
      eventType === EventType.TRAINING
        ? await this.findByTraining(eventId)
        : await this.findByMatch(eventId);

    if (role === UserRole.PLAYER) {
      const player = await this.playersService.findByUserId(userId);
      if (player.group?.id !== event.group.id) {
        throw new ForbiddenException(
          `You do not have access to this ${eventLabel.toLowerCase()}`,
        );
      }
      return allEvaluations.filter((e) => e.player.id === player.id);
    }

    if (role === UserRole.PARENT) {
      const parent = await this.parentsService.findByUserId(userId);
      const childrenInGroup =
        parent.children?.filter(
          (child) => child.group?.id === event.group.id,
        ) || [];
      if (childrenInGroup.length === 0) {
        throw new ForbiddenException(
          `You do not have access to this ${eventLabel.toLowerCase()}`,
        );
      }
      const childIds = childrenInGroup.map((c) => c.id);
      return allEvaluations.filter((e) => childIds.includes(e.player.id));
    }

    throw new ForbiddenException('Access denied');
  }

  async findByPlayerForUser(
    playerId: string,
    userId: string,
    role: UserRole,
  ): Promise<Evaluation[]> {
    if (role === UserRole.ADMIN || role === UserRole.COACH) {
      return this.findByPlayer(playerId);
    }

    if (role === UserRole.PLAYER) {
      const player = await this.playersService.findByUserId(userId);
      if (player.id !== playerId) {
        throw new ForbiddenException('You can only view your own evaluations');
      }
      return this.findByPlayer(playerId);
    }

    if (role === UserRole.PARENT) {
      const parent = await this.parentsService.findByUserId(userId);
      const childIds = parent.children?.map((c) => c.id) || [];
      if (!childIds.includes(playerId)) {
        throw new ForbiddenException(
          "You can only view your children's evaluations",
        );
      }
      return this.findByPlayer(playerId);
    }

    throw new ForbiddenException('Access denied');
  }

  async getRatingStatsForUser(
    playerId: string,
    userId: string,
    role: UserRole,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ) {
    if (role === UserRole.ADMIN || role === UserRole.COACH) {
      return this.getRatingStats(playerId, period);
    }

    if (role === UserRole.PARENT) {
      const parent = await this.parentsService.findByUserId(userId);
      const childIds = parent.children?.map((c) => c.id) || [];
      if (!childIds.includes(playerId)) {
        throw new ForbiddenException(
          "You can only view your children's rating stats",
        );
      }
    }

    return this.getRatingStats(playerId, period);
  }

  async getMyRatingStats(
    userId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ) {
    const player = await this.playersService.findByUserId(userId);
    return this.getRatingStats(player.id, period);
  }
}
