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
  ParseUUIDPipe,
} from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationBatchDto } from './dto/create-evaluation-batch.dto';
import { EvaluationResponseDto } from './dto/evaluation-response.dto';
import { RatingStatsResponseDto } from './dto/rating-stats-response.dto';
import { StatsPeriod } from '../common/enums/stats-period.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EventType } from '../events/enums/event-type.enum';
import { Serialize } from '../common/interceptors/serialize.interceptor';

@Controller('evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post('batch')
  @Roles(UserRole.COACH)
  @HttpCode(HttpStatus.OK)
  @Serialize(EvaluationResponseDto)
  createBatch(
    @Body() dto: CreateEvaluationBatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.evaluationsService.createBatch(dto, user.id);
  }

  @Get('training/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  @Serialize(EvaluationResponseDto)
  getByTraining(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.evaluationsService.findByEventForUser(
      id,
      EventType.TRAINING,
      user.id,
      user.role,
    );
  }

  @Get('match/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  @Serialize(EvaluationResponseDto)
  getByMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.evaluationsService.findByEventForUser(
      id,
      EventType.MATCH,
      user.id,
      user.role,
    );
  }

  @Get('player/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  @Serialize(EvaluationResponseDto)
  getByPlayer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.evaluationsService.findByPlayerForUser(id, user.id, user.role);
  }

  @Get('stats/my')
  @Roles(UserRole.PLAYER)
  @Serialize(RatingStatsResponseDto)
  getMyRatingStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: StatsPeriod,
  ) {
    return this.evaluationsService.getMyRatingStats(user.id, period);
  }

  @Get('stats/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PARENT)
  @Serialize(RatingStatsResponseDto)
  getPlayerRatingStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: StatsPeriod,
  ) {
    return this.evaluationsService.getRatingStatsForUser(
      id,
      user.id,
      user.role,
      period,
    );
  }
}
