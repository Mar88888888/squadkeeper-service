import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PerformanceSettingsService } from './performance-settings.service';
import { StatsPeriod } from '../common/enums/stats-period.enum';
import {
  UpdatePerformanceSettingsDto,
  CopySettingsDto,
} from './dto/performance-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly performanceSettingsService: PerformanceSettingsService,
  ) {}

  @Get('performance-score/my')
  @Roles(UserRole.PLAYER)
  getMyPerformanceScore(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: StatsPeriod,
  ) {
    return this.analyticsService.getMyPerformanceScore(
      user.id,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Get('performance-score/team')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getCoachTeamsPerformanceScores(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: StatsPeriod,
  ) {
    return this.analyticsService.getCoachTeamsPerformanceScores(
      user.id,
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

  @Get('settings/my-groups')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getMyGroups(@CurrentUser() user: AuthenticatedUser) {
    return this.performanceSettingsService.getCoachGroups(user.id);
  }

  @Get('settings/:groupId')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getSettings(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.performanceSettingsService.getSettings(groupId);
  }

  @Patch('settings/:groupId')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  updateSettings(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePerformanceSettingsDto,
  ) {
    return this.performanceSettingsService.updateSettings(
      groupId,
      user.id,
      dto,
    );
  }

  @Delete('settings/:groupId')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  resetSettings(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.performanceSettingsService.resetSettings(groupId, user.id);
  }

  @Post('settings/:groupId/copy')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  copySettings(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CopySettingsDto,
  ) {
    return this.performanceSettingsService.copySettings(
      groupId,
      dto.sourceGroupId,
      user.id,
    );
  }
}
