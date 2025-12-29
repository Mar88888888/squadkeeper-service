import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationBatchDto } from './dto/create-evaluation-batch.dto';
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

    // Admins and coaches see all evaluations
    if (role === UserRole.ADMIN || role === UserRole.COACH) {
      return this.evaluationsService.findByTraining(id);
    }

    // Get the training to verify access
    const training = await this.trainingsRepository.findOne({
      where: { id },
      relations: ['group'],
    });
    if (!training) {
      throw new ForbiddenException('Training not found');
    }

    // Players only see their own evaluations
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

    // Parents see their children's evaluations
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

    // Admins and coaches see all evaluations
    if (role === UserRole.ADMIN || role === UserRole.COACH) {
      return this.evaluationsService.findByMatch(id);
    }

    // Get the match to verify access
    const match = await this.matchesRepository.findOne({
      where: { id },
      relations: ['group'],
    });
    if (!match) {
      throw new ForbiddenException('Match not found');
    }

    // Players only see their own evaluations
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

    // Parents see their children's evaluations
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
  getByPlayer(@Param('id') id: string) {
    return this.evaluationsService.findByPlayer(id);
  }
}
