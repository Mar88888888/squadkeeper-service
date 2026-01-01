import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThanOrEqual, LessThanOrEqual, And } from 'typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { Player } from '../players/entities/player.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';
import { CreateEvaluationBatchDto, EvaluationRecordDto } from './dto/create-evaluation-batch.dto';
import { EvaluationType } from './enums/evaluation-type.enum';

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

    // Check if evaluation already exists for this player, event, and type
    const whereCondition: any = {
      player: { id: record.playerId },
      type: record.type,
    };
    if (training) {
      whereCondition.training = { id: training.id };
    }
    if (match) {
      whereCondition.match = { id: match.id };
    }

    const existingEvaluation = await queryRunner.manager.findOne(Evaluation, {
      where: whereCondition,
      relations: ['player', 'training', 'match', 'coach'],
    });

    if (existingEvaluation) {
      // Update existing evaluation
      existingEvaluation.rating = record.rating;
      existingEvaluation.comment = record.comment || null;
      existingEvaluation.coach = coach;
      return await queryRunner.manager.save(existingEvaluation);
    } else {
      // Create new evaluation
      const evaluation = queryRunner.manager.create(Evaluation, {
        player,
        training,
        match,
        coach,
        type: record.type,
        rating: record.rating,
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

    // Group evaluations by event (training or match)
    const eventMap = new Map<string, {
      date: Date;
      eventType: 'training' | 'match';
      eventId: string;
      evaluations: Evaluation[];
    }>();

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

      const key = `${eventType}-${eventId}`;
      if (!eventMap.has(key)) {
        eventMap.set(key, {
          date: eventDate,
          eventType,
          eventId,
          evaluations: [],
        });
      }
      eventMap.get(key)!.evaluations.push(evaluation);
    }

    // Build history points
    const history: RatingHistoryPoint[] = [];
    const allRatings: number[] = [];
    const categoryRatings: { [key: string]: number[] } = {
      technical: [],
      tactical: [],
      physical: [],
      psychological: [],
    };

    const sortedEvents = Array.from(eventMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    for (const event of sortedEvents) {
      const ratings: { [key: string]: number | null } = {
        technical: null,
        tactical: null,
        physical: null,
        psychological: null,
      };

      let sum = 0;
      let count = 0;

      for (const evaluation of event.evaluations) {
        const categoryKey = evaluation.type.toLowerCase();
        ratings[categoryKey] = evaluation.rating;
        categoryRatings[categoryKey].push(evaluation.rating);
        sum += evaluation.rating;
        count++;
      }

      const averageRating = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
      allRatings.push(averageRating);

      history.push({
        date: event.date.toISOString(),
        eventType: event.eventType,
        eventId: event.eventId,
        averageRating,
        ratings: {
          technical: ratings.technical,
          tactical: ratings.tactical,
          physical: ratings.physical,
          psychological: ratings.psychological,
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
      averageRating: calculateAverage(allRatings),
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
