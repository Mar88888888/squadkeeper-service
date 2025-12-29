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
  Request,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { FilterMatchesDto } from './dto/filter-matches.dto';
import { AddGoalDto } from './dto/add-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('matches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  create(@Body() createMatchDto: CreateMatchDto) {
    return this.matchesService.create(createMatchDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Query() filters: FilterMatchesDto) {
    return this.matchesService.findAll(filters);
  }

  @Get('my')
  @Roles(UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  findMyMatches(
    @Request() req: { user: { id: string; role: UserRole } },
    @Query() filters: FilterMatchesDto,
  ) {
    return this.matchesService.findMyMatches(req.user.id, req.user.role, filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Patch(':id/score')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  updateResult(
    @Param('id') id: string,
    @Body() updateMatchResultDto: UpdateMatchResultDto,
  ) {
    return this.matchesService.updateResult(id, updateMatchResultDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.matchesService.remove(id);
  }

  @Get('group/:groupId')
  @Roles(UserRole.COACH, UserRole.ADMIN, UserRole.PARENT)
  findByGroup(@Param('groupId') groupId: string) {
    return this.matchesService.findByGroup(groupId);
  }

  // Goals endpoints
  @Get(':id/goals')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  getGoals(@Param('id') matchId: string) {
    return this.matchesService.getGoals(matchId);
  }

  @Post(':id/goals')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  addGoal(@Param('id') matchId: string, @Body() addGoalDto: AddGoalDto) {
    return this.matchesService.addGoal(matchId, addGoalDto);
  }

  @Delete(':id/goals/:goalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  removeGoal(@Param('id') matchId: string, @Param('goalId') goalId: string) {
    return this.matchesService.removeGoal(matchId, goalId);
  }
}
