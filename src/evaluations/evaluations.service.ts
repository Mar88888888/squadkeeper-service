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
import { CreateEvaluationBatchDto, EvaluationRecordDto } from './dto/create-evaluation-batch.dto';

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
    private dataSource: DataSource,
  ) {}

  async createBatch(
    dto: CreateEvaluationBatchDto,
    coachUserId: string,
  ): Promise<Evaluation[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find training
      const training = await queryRunner.manager.findOne(Training, {
        where: { id: dto.trainingId },
      });
      if (!training) {
        throw new NotFoundException(`Training with ID ${dto.trainingId} not found`);
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
          coach,
        );
        results.push(evaluation);
      }

      await queryRunner.commitTransaction();
      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException) {
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
    training: Training,
    coach: Coach,
  ): Promise<Evaluation> {
    // Find player
    const player = await queryRunner.manager.findOne(Player, {
      where: { id: record.playerId },
    });
    if (!player) {
      throw new NotFoundException(`Player with ID ${record.playerId} not found`);
    }

    // Check if evaluation already exists for this player, training, and type
    const existingEvaluation = await queryRunner.manager.findOne(Evaluation, {
      where: {
        player: { id: record.playerId },
        training: { id: training.id },
        type: record.type,
      },
      relations: ['player', 'training', 'coach'],
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

  async findByPlayer(playerId: string): Promise<Evaluation[]> {
    return await this.evaluationsRepository.find({
      where: { player: { id: playerId } },
      relations: ['player', 'coach', 'training'],
      order: { createdAt: 'DESC' },
    });
  }
}
