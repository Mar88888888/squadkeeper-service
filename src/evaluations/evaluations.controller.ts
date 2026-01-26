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
  ParseUUIDPipe,
} from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationBatchDto } from './dto/create-evaluation-batch.dto';
import { StatsPeriod } from '../common/enums/stats-period.enum';
import { getDateRangeForPeriod } from '../common/utils/date-range.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

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
  getByTraining(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: UserRole } },
  ) {
    return this.evaluationsService.findByTrainingForUser(id, req.user.id, req.user.role);
  }

  @Get('match/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  getByMatch(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: UserRole } },
  ) {
    return this.evaluationsService.findByMatchForUser(id, req.user.id, req.user.role);
  }

  @Get('player/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  getByPlayer(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string; role: UserRole } },
  ) {
    return this.evaluationsService.findByPlayerForUser(id, req.user.id, req.user.role);
  }

  @Get('stats/my')
  @Roles(UserRole.PLAYER)
  getMyRatingStats(
    @Request() req: { user: { id: string } },
    @Query('period') period?: StatsPeriod,
  ) {
    const dateRange = getDateRangeForPeriod(period || StatsPeriod.ALL_TIME);
    return this.evaluationsService.getMyRatingStats(req.user.id, dateRange.start, dateRange.end);
  }

  @Get('stats/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PARENT)
  getPlayerRatingStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period?: StatsPeriod,
    @Request() req?: { user: { id: string; role: UserRole } },
  ) {
    const dateRange = getDateRangeForPeriod(period || StatsPeriod.ALL_TIME);
    return this.evaluationsService.getRatingStatsForUser(
      id,
      req!.user.id,
      req!.user.role,
      dateRange.start,
      dateRange.end,
    );
  }
}
