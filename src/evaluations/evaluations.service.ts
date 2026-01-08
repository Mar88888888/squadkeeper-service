import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { Player } from '../players/entities/player.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { AttendanceStatus } from '../attendance/enums/attendance-status.enum';
import { CreateEvaluationBatchDto, EvaluationRecordDto } from './dto/create-evaluation-batch.dto';

// Statuses that count as "played" - can receive evaluations
const PLAYED_STATUSES = [AttendanceStatus.PRESENT, AttendanceStatus.LATE];

// Default rating for missing values
const DEFAULT_RATING = 5;

export interface RatingHistoryPoint {
  date: string;
  eventType: 'training' | 'match';
  eventId: string;
  averageRating: number;
  ratings: {
    technical: number | null;
    tactical: number | null;
    physical: number | null;
    psychological: number | null;
  };
}

export interface RatingStats {
  averageRating: number | null;
  totalEvents: number;
  byCategory: {
    technical: number | null;
    tactical: number | null;
    physical: number | null;
    psychological: number | null;
  };
  history: RatingHistoryPoint[];
}

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
    @InjectRepository(Training)
    private trainingsRepository: Repository<Training>,
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
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
      throw new BadRequestException('Cannot specify both trainingId and matchId');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let training: Training | null = null;
      let match: Match | null = null;

      if (dto.trainingId) {
        training = await queryRunner.manager.findOne(Training, {
          where: { id: dto.trainingId },
        });
        if (!training) {
          throw new NotFoundException(`Training with ID ${dto.trainingId} not found`);
        }
      }

      if (dto.matchId) {
        match = await queryRunner.manager.findOne(Match, {
          where: { id: dto.matchId },
        });
        if (!match) {
          throw new NotFoundException(`Match with ID ${dto.matchId} not found`);
        }
      }

      // Find coach by user ID
      const coach = await queryRunner.manager.findOne(Coach, {
        where: { user: { id: coachUserId } },
      });
      if (!coach) {
        throw new NotFoundException('Coach profile not found');
      }

      const results: Evaluation[] = [];

      for (const record of dto.records) {
        const evaluation = await this.upsertEvaluation(
          queryRunner,
          record,
          training,
          match,
          coach,
        );
        results.push(evaluation);
      }

      await queryRunner.commitTransaction();
      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create evaluations');
    } finally {
      await queryRunner.release();
    }
  }

  private async upsertEvaluation(
    queryRunner: any,
    record: EvaluationRecordDto,
    training: Training | null,
    match: Match | null,
    coach: Coach,
  ): Promise<Evaluation> {
    // Find player
    const player = await queryRunner.manager.findOne(Player, {
      where: { id: record.playerId },
    });
    if (!player) {
      throw new NotFoundException(`Player with ID ${record.playerId} not found`);
    }

    // Check if player has valid attendance (PRESENT or LATE) for this event
    const attendanceWhere: any = { player: { id: record.playerId } };
    if (training) {
      attendanceWhere.training = { id: training.id };
    }
    if (match) {
      attendanceWhere.match = { id: match.id };
    }

    const attendance = await queryRunner.manager.findOne(Attendance, {
      where: attendanceWhere,
    });

    if (!attendance || !PLAYED_STATUSES.includes(attendance.status)) {
      throw new BadRequestException(
        `Cannot evaluate player ${player.firstName} ${player.lastName} - they did not play in this event`,
      );
    }

    // Check if evaluation already exists for this player and event
    const whereCondition: any = {
      player: { id: record.playerId },
    };
    if (training) {
      whereCondition.training = { id: training.id };
    } else {
      whereCondition.training = null;
    }
    if (match) {
      whereCondition.match = { id: match.id };
    } else {
      whereCondition.match = null;
    }

    const existingEvaluation = await queryRunner.manager.findOne(Evaluation, {
      where: whereCondition,
      relations: ['player', 'training', 'match', 'coach'],
    });

    if (existingEvaluation) {
      // Update existing evaluation - only update fields that are provided
      if (record.technical !== undefined) {
        existingEvaluation.technical = record.technical;
      }
      if (record.tactical !== undefined) {
        existingEvaluation.tactical = record.tactical;
      }
      if (record.physical !== undefined) {
        existingEvaluation.physical = record.physical;
      }
      if (record.psychological !== undefined) {
        existingEvaluation.psychological = record.psychological;
      }
      if (record.comment !== undefined) {
        existingEvaluation.comment = record.comment || null;
      }
      existingEvaluation.coach = coach;
      return await queryRunner.manager.save(existingEvaluation);
    } else {
      // Create new evaluation - use default values for missing ratings
      const evaluation = queryRunner.manager.create(Evaluation, {
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
      return await queryRunner.manager.save(evaluation);
    }
  }

  async findByTraining(trainingId: string): Promise<Evaluation[]> {
    const training = await this.trainingsRepository.findOne({
      where: { id: trainingId },
    });
    if (!training) {
      throw new NotFoundException(`Training with ID ${trainingId} not found`);
    }

    return await this.evaluationsRepository.find({
      where: { training: { id: trainingId } },
      relations: ['player', 'coach', 'training'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByMatch(matchId: string): Promise<Evaluation[]> {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    return await this.evaluationsRepository.find({
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
    startDate?: Date,
    endDate?: Date,
  ): Promise<RatingStats> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
    });
    if (!player) {
      throw new NotFoundException(`Player with ID ${playerId} not found`);
    }

    // Get all evaluations for the player
    const evaluations = await this.evaluationsRepository.find({
      where: { player: { id: playerId } },
      relations: ['training', 'match'],
      order: { createdAt: 'ASC' },
    });

    // Filter by date and build history
    const history: RatingHistoryPoint[] = [];
    const categoryRatings: { [key: string]: number[] } = {
      technical: [],
      tactical: [],
      physical: [],
      psychological: [],
    };
    const allAverages: number[] = [];

    for (const evaluation of evaluations) {
      let eventDate: Date;
      let eventType: 'training' | 'match';
      let eventId: string;

      if (evaluation.training) {
        eventDate = new Date(evaluation.training.startTime);
        eventType = 'training';
        eventId = evaluation.training.id;
      } else if (evaluation.match) {
        eventDate = new Date(evaluation.match.startTime);
        eventType = 'match';
        eventId = evaluation.match.id;
      } else {
        continue;
      }

      // Apply date filter
      if (startDate && eventDate < startDate) continue;
      if (endDate && eventDate > endDate) continue;

      // Calculate average for this evaluation
      const ratings = [
        evaluation.technical,
        evaluation.tactical,
        evaluation.physical,
        evaluation.psychological,
      ].filter((r): r is number => r !== null);

      const averageRating = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 0;

      allAverages.push(averageRating);

      // Collect category ratings
      if (evaluation.technical !== null) categoryRatings.technical.push(evaluation.technical);
      if (evaluation.tactical !== null) categoryRatings.tactical.push(evaluation.tactical);
      if (evaluation.physical !== null) categoryRatings.physical.push(evaluation.physical);
      if (evaluation.psychological !== null) categoryRatings.psychological.push(evaluation.psychological);

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

    // Calculate overall averages
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
}
