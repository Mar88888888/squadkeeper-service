import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationBatchDto } from './dto/create-evaluation-batch.dto';
import { StatsPeriod } from '../common/enums/stats-period.enum';
import { getDateRangeForPeriod } from '../common/utils/date-range.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';

@Controller('evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationsController {
  constructor(
    private readonly evaluationsService: EvaluationsService,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(Parent)
    private parentsRepository: Repository<Parent>,
    @InjectRepository(Training)
    private trainingsRepository: Repository<Training>,
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
  ) {}

  @Post('batch')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  @HttpCode(HttpStatus.OK)
  createBatch(
    @Body() dto: CreateEvaluationBatchDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.evaluationsService.createBatch(dto, req.user.id);
  }

  @Get('training/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  async getByTraining(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: UserRole } },
  ) {
    const { id: userId, role } = req.user;

    if (role === UserRole.ADMIN || role === UserRole.COACH) {
      return this.evaluationsService.findByTraining(id);
    }

    const training = await this.trainingsRepository.findOne({
      where: { id },
      relations: ['group'],
    });
    if (!training) {
      throw new ForbiddenException('Training not found');
    }

    if (role === UserRole.PLAYER) {
      const player = await this.playersRepository.findOne({
        where: { user: { id: userId } },
        relations: ['group'],
      });
      if (!player || player.group?.id !== training.group.id) {
        throw new ForbiddenException('You do not have access to this training');
      }
      const allEvaluations = await this.evaluationsService.findByTraining(id);
      return allEvaluations.filter((e) => e.player.id === player.id);
    }

    if (role === UserRole.PARENT) {
      const parent = await this.parentsRepository.findOne({
        where: { user: { id: userId } },
        relations: ['children', 'children.group'],
      });
      const childrenInGroup = parent?.children?.filter(
        (child) => child.group?.id === training.group.id,
      ) || [];
      if (childrenInGroup.length === 0) {
        throw new ForbiddenException('You do not have access to this training');
      }
      const childIds = childrenInGroup.map((c) => c.id);
      const allEvaluations = await this.evaluationsService.findByTraining(id);
      return allEvaluations.filter((e) => childIds.includes(e.player.id));
    }

    throw new ForbiddenException('Access denied');
  }

  @Get('match/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  async getByMatch(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: UserRole } },
  ) {
    const { id: userId, role } = req.user;

    if (role === UserRole.ADMIN || role === UserRole.COACH) {
      return this.evaluationsService.findByMatch(id);
    }

    const match = await this.matchesRepository.findOne({
      where: { id },
      relations: ['group'],
    });
    if (!match) {
      throw new ForbiddenException('Match not found');
    }

    if (role === UserRole.PLAYER) {
      const player = await this.playersRepository.findOne({
        where: { user: { id: userId } },
        relations: ['group'],
      });
      if (!player || player.group?.id !== match.group.id) {
        throw new ForbiddenException('You do not have access to this match');
      }
      const allEvaluations = await this.evaluationsService.findByMatch(id);
      return allEvaluations.filter((e) => e.player.id === player.id);
    }

    if (role === UserRole.PARENT) {
      const parent = await this.parentsRepository.findOne({
        where: { user: { id: userId } },
        relations: ['children', 'children.group'],
      });
      const childrenInGroup = parent?.children?.filter(
        (child) => child.group?.id === match.group.id,
      ) || [];
      if (childrenInGroup.length === 0) {
        throw new ForbiddenException('You do not have access to this match');
      }
      const childIds = childrenInGroup.map((c) => c.id);
      const allEvaluations = await this.evaluationsService.findByMatch(id);
      return allEvaluations.filter((e) => childIds.includes(e.player.id));
    }

    throw new ForbiddenException('Access denied');
  }

  @Get('player/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  async getByPlayer(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string; role: UserRole } },
  ) {
    const { id: userId, role } = req.user;

    if (role === UserRole.ADMIN || role === UserRole.COACH) {
      return this.evaluationsService.findByPlayer(id);
    }

    if (role === UserRole.PLAYER) {
      const player = await this.playersRepository.findOne({
        where: { user: { id: userId } },
      });
      if (!player || player.id !== id) {
        throw new ForbiddenException('You can only view your own evaluations');
      }
      return this.evaluationsService.findByPlayer(id);
    }

    if (role === UserRole.PARENT) {
      const parent = await this.parentsRepository.findOne({
        where: { user: { id: userId } },
        relations: ['children'],
      });
      const childIds = parent?.children?.map((c) => c.id) || [];
      if (!childIds.includes(id)) {
        throw new ForbiddenException('You can only view your children\'s evaluations');
      }
      return this.evaluationsService.findByPlayer(id);
    }

    throw new ForbiddenException('Access denied');
  }

  @Get('stats/my')
  @Roles(UserRole.PLAYER)
  async getMyRatingStats(
    @Request() req: { user: { id: string } },
    @Query('period') period?: StatsPeriod,
  ) {
    const player = await this.playersRepository.findOne({
      where: { user: { id: req.user.id } },
    });
    if (!player) {
      throw new ForbiddenException('Player profile not found');
    }

    const dateRange = getDateRangeForPeriod(period || StatsPeriod.ALL_TIME);
    return this.evaluationsService.getRatingStats(player.id, dateRange.start, dateRange.end);
  }

  @Get('stats/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PARENT)
  async getPlayerRatingStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period?: StatsPeriod,
    @Request() req?: { user: { id: string; role: UserRole } },
  ) {
    if (req?.user.role === UserRole.PARENT) {
      const parent = await this.parentsRepository.findOne({
        where: { user: { id: req.user.id } },
        relations: ['children'],
      });
      const childIds = parent?.children?.map((c) => c.id) || [];
      if (!childIds.includes(id)) {
        throw new ForbiddenException('You can only view your children\'s rating stats');
      }
    }

    const dateRange = getDateRangeForPeriod(period || StatsPeriod.ALL_TIME);
    return this.evaluationsService.getRatingStats(id, dateRange.start, dateRange.end);
  }
}
