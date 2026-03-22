import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere, ILike } from 'typeorm';
import { Match } from './entities/match.entity';
import { GroupsService } from '../groups/groups.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { FilterMatchesDto } from './dto/filter-matches.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { MatchType } from './enums/match-type.enum';
import { buildDateFilter } from './utils/date-filter.util';
import { TimeFilter } from './enums/time-filter.enum';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  private getSortDirection(filters: FilterMatchesDto): 'ASC' | 'DESC' {
    return filters.timeFilter === TimeFilter.PAST ? 'DESC' : 'ASC';
  }

  constructor(
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    private groupsService: GroupsService,
  ) {}

  private buildWhere(
    filters: FilterMatchesDto,
    groupIds?: string[],
  ): FindOptionsWhere<Match> | FindOptionsWhere<Match>[] {
    const dateFilter = buildDateFilter(filters);
    const groupWhere =
      filters.groupId
        ? { id: filters.groupId }
        : groupIds
          ? { id: In(groupIds) }
          : undefined;
    const base: FindOptionsWhere<Match> = {
      ...(dateFilter ?? {}),
      ...(groupWhere ? { group: groupWhere } : {}),
    };

    if (!filters.search?.trim()) {
      return base;
    }

    const search = `%${filters.search.trim()}%`;
    return [
      { ...base, opponent: ILike(search) },
      { ...base, location: ILike(search) },
      { ...base, group: { ...(groupWhere ?? {}), name: ILike(search) } },
    ];
  }

  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    const group = await this.groupsService.findOne(createMatchDto.groupId);

    const match = this.matchesRepository.create({
      ...createMatchDto,
      matchType: createMatchDto.matchType || MatchType.FRIENDLY,
      group,
      homeGoals: null,
      awayGoals: null,
    });

    const saved = await this.matchesRepository.save(match);
    this.logger.log(`Match created: ${saved.id} for group ${group.id}`);
    return saved;
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

    this.validateScore(match, updateMatchResultDto);

    match.homeGoals = updateMatchResultDto.homeGoals;
    match.awayGoals = updateMatchResultDto.awayGoals;

    const saved = await this.matchesRepository.save(match);
    this.logger.log(
      `Match result updated: ${id} (${saved.homeGoals}-${saved.awayGoals})`,
    );
    return saved;
  }

  private validateScore(match: Match, dto: UpdateMatchResultDto): void {
    if (!match.goals || match.goals.length === 0) return;

    const regularGoals = match.goals.filter((g) => !g.isOwnGoal).length;
    const ownGoals = match.goals.filter((g) => g.isOwnGoal).length;

    const ourScore = match.isHome ? dto.homeGoals : dto.awayGoals;
    const theirScore = match.isHome ? dto.awayGoals : dto.homeGoals;

    if (ourScore < regularGoals) {
      throw new BadRequestException(
        `Cannot set team score to ${ourScore}. There are ${regularGoals} goals already recorded`,
      );
    }

    if (theirScore < ownGoals) {
      throw new BadRequestException(
        `Cannot set conceded goals to ${theirScore}. There are ${ownGoals} own goals already recorded`,
      );
    }
  }

  async findAll(
    filters: FilterMatchesDto = {},
  ): Promise<{ items: Match[]; total: number }> {
    const sortDirection = this.getSortDirection(filters);
    const where = this.buildWhere(filters);

    const [items, total] = await this.matchesRepository.findAndCount({
      where,
      relations: ['group'],
      order: { startTime: sortDirection },
      skip: filters.skip,
      take: filters.take,
    });
    return { items, total };
  }

  async findMyMatches(
    groupIds: string[],
    role: UserRole,
    filters: FilterMatchesDto = {},
  ): Promise<{ items: Match[]; total: number }> {
    if (role === UserRole.ADMIN) {
      return this.findAll(filters);
    }

    if (groupIds.length === 0) {
      return { items: [], total: 0 };
    }

    const where = this.buildWhere(filters, groupIds);
    const sortDirection = this.getSortDirection(filters);

    const [items, total] = await this.matchesRepository.findAndCount({
      where,
      relations: ['group'],
      order: { startTime: sortDirection },
      skip: filters.skip,
      take: filters.take,
    });
    return { items, total };
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
      this.logger.log(`Match deleted: ${id}`);
    }
  }
}

