import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { GoalsService } from './goals.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { FilterMatchesDto } from './dto/filter-matches.dto';
import { AddGoalDto } from './dto/add-goal.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { MatchListResponseDto } from './dto/match-list-response.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';
import { PermissionsService } from '../auth/permissions.service';
import { Serialize } from '../common/interceptors/serialize.interceptor';

@Controller('matches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly goalsService: GoalsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  @Serialize(MatchResponseDto)
  create(
    @Body() createMatchDto: CreateMatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (
      !this.permissionsService.checkGroupAccess(user, createMatchDto.groupId)
    ) {
      throw new ForbiddenException(
        'You can only create matches for your own groups',
      );
    }
    return this.matchesService.create(createMatchDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @Serialize(MatchListResponseDto)
  findAll(@Query() filters: FilterMatchesDto) {
    return this.matchesService.findAll(filters);
  }

  @Get('my')
  @Roles(UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  @Serialize(MatchListResponseDto)
  findMyMatches(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterMatchesDto,
  ) {
    return this.matchesService.findMyMatches(user.groupIds, user.role, filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  @Serialize(MatchResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.matchesService.findOne(id);
  }

  @Patch(':id/score')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  @Serialize(MatchResponseDto)
  async updateResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMatchResultDto: UpdateMatchResultDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const match = await this.matchesService.findOne(id);

    if (!this.permissionsService.checkEventAccess(user, match)) {
      throw new ForbiddenException(
        'You can only update scores for your own groups',
      );
    }

    return this.matchesService.updateResult(id, updateMatchResultDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const match = await this.matchesService.findOne(id);

    if (!this.permissionsService.checkEventAccess(user, match)) {
      throw new ForbiddenException(
        'You can only delete matches for your own groups',
      );
    }

    return this.matchesService.remove(id);
  }

  @Get(':id/goals')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  @Serialize(GoalResponseDto)
  getGoals(@Param('id', ParseUUIDPipe) matchId: string) {
    return this.goalsService.getGoals(matchId);
  }

  @Post(':id/goals')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  @Serialize(GoalResponseDto)
  async addGoal(
    @Param('id', ParseUUIDPipe) matchId: string,
    @Body() addGoalDto: AddGoalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const match = await this.matchesService.findOne(matchId);

    if (!this.permissionsService.checkEventAccess(user, match)) {
      throw new ForbiddenException(
        'You can only add goals to matches for your own groups',
      );
    }

    return this.goalsService.addGoal(matchId, addGoalDto);
  }

  @Delete(':id/goals/:goalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  async removeGoal(
    @Param('id', ParseUUIDPipe) matchId: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const match = await this.matchesService.findOne(matchId);

    if (!this.permissionsService.checkEventAccess(user, match)) {
      throw new ForbiddenException(
        'You can only remove goals from matches for your own groups',
      );
    }

    return this.goalsService.removeGoal(matchId, goalId);
  }
}
