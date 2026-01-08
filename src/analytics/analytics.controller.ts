import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { StatsPeriod } from '../players/dto/player-stats.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ========== PERFORMANCE SCORE ENDPOINTS ==========

  @Get('performance-score/my')
  @Roles(UserRole.PLAYER)
  getMyPerformanceScore(
    @Request() req: { user: { id: string } },
    @Query('period') period?: StatsPeriod,
  ) {
    return this.analyticsService.getMyPerformanceScore(
      req.user.id,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Get('performance-score/team')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getCoachTeamsPerformanceScores(
    @Request() req: { user: { id: string } },
    @Query('period') period?: StatsPeriod,
  ) {
    return this.analyticsService.getCoachTeamsPerformanceScores(
      req.user.id,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Get('performance-score/group/:groupId')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getTeamPerformanceScores(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query('period') period?: StatsPeriod,
  ) {
    return this.analyticsService.getTeamPerformanceScores(
      groupId,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Get('performance-score/:playerId')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getPerformanceScore(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query('period') period?: StatsPeriod,
  ) {
    return this.analyticsService.getPerformanceScore(
      playerId,
      period || StatsPeriod.ALL_TIME,
    );
  }

  // ========== TEAM CHEMISTRY ENDPOINTS ==========

  @Get('chemistry/my-teams')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getCoachTeamsChemistry(
    @Request() req: { user: { id: string } },
    @Query('period') period?: StatsPeriod,
  ) {
    return this.analyticsService.getCoachTeamsChemistry(
      req.user.id,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Get('chemistry/:groupId')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getTeamChemistry(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query('period') period?: StatsPeriod,
    @Query('minMatches') minMatches?: number,
  ) {
    return this.analyticsService.getTeamChemistry(
      groupId,
      period || StatsPeriod.ALL_TIME,
      minMatches || 3,
    );
  }
}
