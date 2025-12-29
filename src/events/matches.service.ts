import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  In,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  FindOptionsWhere,
} from 'typeorm';
import { Match } from './entities/match.entity';
import { Goal } from './entities/goal.entity';
import { Group } from '../groups/entities/group.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { FilterMatchesDto, MatchTimeFilter } from './dto/filter-matches.dto';
import { AddGoalDto } from './dto/add-goal.dto';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(Parent)
    private parentsRepository: Repository<Parent>,
  ) {}

  private buildDateFilter(
    filters: FilterMatchesDto,
  ): FindOptionsWhere<Match> | undefined {
    const now = new Date();

    if (filters.timeFilter && filters.timeFilter !== MatchTimeFilter.ALL) {
      switch (filters.timeFilter) {
        case MatchTimeFilter.UPCOMING:
          return { startTime: MoreThanOrEqual(now) };

        case MatchTimeFilter.PAST:
          return { startTime: LessThanOrEqual(now) };

        case MatchTimeFilter.THIS_WEEK: {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay() + 1);
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return { startTime: Between(startOfWeek, endOfWeek) };
        }

        case MatchTimeFilter.NEXT_WEEK: {
          const startOfNextWeek = new Date(now);
          startOfNextWeek.setDate(now.getDate() - now.getDay() + 8);
          startOfNextWeek.setHours(0, 0, 0, 0);
          const endOfNextWeek = new Date(startOfNextWeek);
          endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
          endOfNextWeek.setHours(23, 59, 59, 999);
          return { startTime: Between(startOfNextWeek, endOfNextWeek) };
        }

        case MatchTimeFilter.THIS_MONTH: {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
          return { startTime: Between(startOfMonth, endOfMonth) };
        }
      }
    }

    if (filters.dateFrom && filters.dateTo) {
      return {
        startTime: Between(
          new Date(filters.dateFrom),
          new Date(filters.dateTo + 'T23:59:59.999Z'),
        ),
      };
    }
    if (filters.dateFrom) {
      return { startTime: MoreThanOrEqual(new Date(filters.dateFrom)) };
    }
    if (filters.dateTo) {
      return {
        startTime: LessThanOrEqual(new Date(filters.dateTo + 'T23:59:59.999Z')),
      };
    }

    return undefined;
  }

  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    // Check if group exists
    const group = await this.groupsRepository.findOne({
      where: { id: createMatchDto.groupId },
    });

    if (!group) {
      throw new NotFoundException(
        `Group with id ${createMatchDto.groupId} not found`,
      );
    }

    // Validate endTime > startTime
    if (createMatchDto.endTime <= createMatchDto.startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const match = this.matchesRepository.create({
      ...createMatchDto,
      group,
      homeGoals: null,
      awayGoals: null,
    });

    return await this.matchesRepository.save(match);
  }

  async updateResult(
    id: string,
    updateMatchResultDto: UpdateMatchResultDto,
  ): Promise<Match> {
    const match = await this.matchesRepository.findOne({
      where: { id },
    });

    if (!match) {
      throw new NotFoundException(`Match with id ${id} not found`);
    }

    match.homeGoals = updateMatchResultDto.homeGoals;
    match.awayGoals = updateMatchResultDto.awayGoals;

    return await this.matchesRepository.save(match);
  }

  async findAll(filters: FilterMatchesDto = {}): Promise<Match[]> {
    const dateFilter = this.buildDateFilter(filters);

    return await this.matchesRepository.find({
      where: dateFilter,
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }

  async findMyMatches(
    userId: string,
    role: UserRole,
    filters: FilterMatchesDto = {},
  ): Promise<Match[]> {
    let groupIds: string[] = [];

    if (role === UserRole.ADMIN) {
      return this.findAll(filters);
    }

    if (role === UserRole.COACH) {
      const coach = await this.coachesRepository.findOne({
        where: { user: { id: userId } },
        relations: ['headGroups', 'assistantGroups'],
      });
      if (coach) {
        groupIds = [
          ...coach.headGroups.map((g) => g.id),
          ...coach.assistantGroups.map((g) => g.id),
        ];
      }
    }

    if (role === UserRole.PLAYER) {
      const player = await this.playersRepository.findOne({
        where: { user: { id: userId } },
        relations: ['group'],
      });
      if (player?.group) {
        groupIds = [player.group.id];
      }
    }

    if (role === UserRole.PARENT) {
      const parent = await this.parentsRepository.findOne({
        where: { user: { id: userId } },
        relations: ['children', 'children.group'],
      });
      if (parent?.children) {
        groupIds = parent.children
          .filter((child) => child.group)
          .map((child) => child.group.id);
      }
    }

    if (groupIds.length === 0) {
      return [];
    }

    const dateFilter = this.buildDateFilter(filters);
    const whereCondition: FindOptionsWhere<Match> = {
      group: { id: In(groupIds) },
      ...dateFilter,
    };

    return await this.matchesRepository.find({
      where: whereCondition,
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Match> {
    const match = await this.matchesRepository.findOne({
      where: { id },
      relations: ['group', 'group.players', 'goals', 'goals.scorer', 'goals.assist'],
    });

    if (!match) {
      throw new NotFoundException(`Match with id ${id} not found`);
    }

    return match;
  }

  async findByGroup(groupId: string): Promise<Match[]> {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    return await this.matchesRepository.find({
      where: { group: { id: groupId } },
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }

  async remove(id: string): Promise<void> {
    const match = await this.matchesRepository.findOne({
      where: { id },
    });

    if (!match) {
      throw new NotFoundException(`Match with id ${id} not found`);
    }

    await this.matchesRepository.remove(match);
  }

  async addGoal(matchId: string, addGoalDto: AddGoalDto): Promise<Goal> {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
      relations: ['group', 'group.players'],
    });

    if (!match) {
      throw new NotFoundException(`Match with id ${matchId} not found`);
    }

    const scorer = await this.playersRepository.findOne({
      where: { id: addGoalDto.scorerId },
    });

    if (!scorer) {
      throw new NotFoundException(`Player with id ${addGoalDto.scorerId} not found`);
    }

    let assist: Player | null = null;
    if (addGoalDto.assistId) {
      assist = await this.playersRepository.findOne({
        where: { id: addGoalDto.assistId },
      });
      if (!assist) {
        throw new NotFoundException(`Player with id ${addGoalDto.assistId} not found`);
      }
    }

    const goal = this.goalsRepository.create({
      match,
      scorer,
      assist,
      minute: addGoalDto.minute || null,
      isOwnGoal: addGoalDto.isOwnGoal || false,
    });

    return await this.goalsRepository.save(goal);
  }

  async removeGoal(matchId: string, goalId: string): Promise<void> {
    const goal = await this.goalsRepository.findOne({
      where: { id: goalId, match: { id: matchId } },
    });

    if (!goal) {
      throw new NotFoundException(`Goal not found`);
    }

    await this.goalsRepository.remove(goal);
  }

  async getGoals(matchId: string): Promise<Goal[]> {
    return await this.goalsRepository.find({
      where: { match: { id: matchId } },
      relations: ['scorer', 'assist'],
      order: { minute: 'ASC' },
    });
  }
}
