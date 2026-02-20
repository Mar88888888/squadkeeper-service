import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { Match } from './entities/match.entity';
import { GroupsService } from '../groups/groups.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { FilterMatchesDto } from './dto/filter-matches.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { MatchType } from './enums/match-type.enum';
import { buildDateFilter } from '../common/utils/date-filter.util';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    private groupsService: GroupsService,
  ) {}

  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    const group = await this.groupsService.findOne(createMatchDto.groupId);

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
      const existingRegularGoals = match.goals.filter(
        (g) => !g.isOwnGoal,
      ).length;
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
    groupIds: string[],
    role: UserRole,
    filters: FilterMatchesDto = {},
  ): Promise<Match[]> {
    if (role === UserRole.ADMIN) {
      return this.findAll(filters);
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
      relations: [
        'group',
        'group.players',
        'goals',
        'goals.scorer',
        'goals.assist',
      ],
    });

    if (!match) {
      throw new NotFoundException(`Match with id ${id} not found`);
    }

    return match;
  }

  async remove(id: string): Promise<void> {
    const match = await this.matchesRepository.findOne({
      where: { id },
    });

    if (match) {
      await this.matchesRepository.remove(match);
    }
  }
}
