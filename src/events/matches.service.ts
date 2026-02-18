import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { Match } from './entities/match.entity';
import { Goal } from './entities/goal.entity';
import { Group } from '../groups/entities/group.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { FilterMatchesDto } from './dto/filter-matches.dto';
import { AddGoalDto } from './dto/add-goal.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { MatchType } from './enums/match-type.enum';
import { buildDateFilter } from '../common/utils/date-filter.util';

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
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  private async validatePlayerPlayed(
    playerId: string,
    matchId: string,
    playerName: string,
    role: 'scorer' | 'assist',
  ): Promise<void> {
    const attendance = await this.attendanceRepository.findOne({
      where: {
        player: { id: playerId },
        match: { id: matchId },
      },
    });

    if (!attendance || !attendance.isPresent) {
      throw new BadRequestException(
        `Cannot record ${role} for ${playerName} - player was not present at this match`,
      );
    }
  }

  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    const group = await this.groupsRepository.findOne({
      where: { id: createMatchDto.groupId },
    });

    if (!group) {
      throw new NotFoundException(
        `Group with id ${createMatchDto.groupId} not found`,
      );
    }

    if (createMatchDto.endTime <= createMatchDto.startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const match = this.matchesRepository.create({
      ...createMatchDto,
      matchType: createMatchDto.matchType || MatchType.FRIENDLY,
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
      relations: ['goals'],
    });

    if (!match) {
      throw new NotFoundException(`Match with id ${id} not found`);
    }

    if (match.goals && match.goals.length > 0) {
      const existingRegularGoals = match.goals.filter((g) => !g.isOwnGoal).length;
      const existingOwnGoals = match.goals.filter((g) => g.isOwnGoal).length;

      const newOurGoals = match.isHome
        ? updateMatchResultDto.homeGoals
        : updateMatchResultDto.awayGoals;
      const newConcededGoals = match.isHome
        ? updateMatchResultDto.awayGoals
        : updateMatchResultDto.homeGoals;

      if (newOurGoals < existingRegularGoals) {
        throw new BadRequestException(
          `Cannot set team score to ${newOurGoals}. There are ${existingRegularGoals} goals already recorded`,
        );
      }

      if (newConcededGoals < existingOwnGoals) {
        throw new BadRequestException(
          `Cannot set conceded goals to ${newConcededGoals}. There are ${existingOwnGoals} own goals already recorded`,
        );
      }
    }

    match.homeGoals = updateMatchResultDto.homeGoals;
    match.awayGoals = updateMatchResultDto.awayGoals;

    return await this.matchesRepository.save(match);
  }

  async findAll(filters: FilterMatchesDto = {}): Promise<Match[]> {
    const dateFilter = buildDateFilter(filters);

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

    const dateFilter = buildDateFilter(filters);
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
      relations: ['group', 'group.players', 'goals'],
    });

    if (!match) {
      throw new NotFoundException(`Match with id ${matchId} not found`);
    }

    if (match.homeGoals === null || match.awayGoals === null) {
      throw new BadRequestException(
        'Cannot add goals before match result is set',
      );
    }

    const ourGoals = match.isHome ? match.homeGoals : match.awayGoals;
    const concededGoals = match.isHome ? match.awayGoals : match.homeGoals;

    const existingGoals = match.goals || [];
    const existingRegularGoals = existingGoals.filter((g) => !g.isOwnGoal).length;
    const existingOwnGoals = existingGoals.filter((g) => g.isOwnGoal).length;

    const isOwnGoal = addGoalDto.isOwnGoal || false;

    if (isOwnGoal) {
      if (existingOwnGoals >= concededGoals) {
        throw new BadRequestException(
          `Cannot add more own goals. Own goals (${existingOwnGoals}) already match conceded goals (${concededGoals})`,
        );
      }
    } else {
      if (existingRegularGoals >= ourGoals) {
        throw new BadRequestException(
          `Cannot add more goals. Recorded goals (${existingRegularGoals}) already match team score (${ourGoals})`,
        );
      }
    }

    const scorer = await this.playersRepository.findOne({
      where: { id: addGoalDto.scorerId },
    });

    if (!scorer) {
      throw new NotFoundException(`Player with id ${addGoalDto.scorerId} not found`);
    }

    await this.validatePlayerPlayed(
      scorer.id,
      matchId,
      `${scorer.firstName} ${scorer.lastName}`,
      'scorer',
    );

    let assist: Player | null = null;
    if (addGoalDto.assistId) {
      assist = await this.playersRepository.findOne({
        where: { id: addGoalDto.assistId },
      });
      if (!assist) {
        throw new NotFoundException(`Player with id ${addGoalDto.assistId} not found`);
      }

      await this.validatePlayerPlayed(
        assist.id,
        matchId,
        `${assist.firstName} ${assist.lastName}`,
        'assist',
      );
    }

    const goal = this.goalsRepository.create({
      match,
      scorer,
      assist,
      minute: addGoalDto.minute || null,
      isOwnGoal,
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
