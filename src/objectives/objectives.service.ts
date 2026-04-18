import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { Objective } from './entities/objective.entity';
import { Player } from '../players/entities/player.entity';
import { Group } from '../groups/entities/group.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Goal } from '../events/entities/goal.entity';
import { Match } from '../events/entities/match.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { ObjectiveMetric } from './enums/objective-metric.enum';
import { ObjectiveScope } from './enums/objective-scope.enum';
import { ObjectiveStatus } from './enums/objective-status.enum';
import { CreateObjectiveDto } from './dto/create-objective.dto';
import { CreateGroupObjectiveDto } from './dto/create-group-objective.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';
import { DEFENSIVE_POSITIONS } from '../players/enums/position.enum';

@Injectable()
export class ObjectivesService {
  constructor(
    @InjectRepository(Objective)
    private objectivesRepository: Repository<Objective>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
  ) {}

  async create(
    dto: CreateObjectiveDto,
    user: AuthenticatedUser,
  ): Promise<Objective> {
    this.assertValidPeriod(dto.periodStart, dto.periodEnd);

    const player = await this.findPlayerOrThrow(dto.playerId);
    this.assertCanManagePlayer(user, player);

    const objective = this.objectivesRepository.create({
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      scope: ObjectiveScope.PLAYER,
      metric: dto.metric,
      targetValue: this.toFixed2(dto.targetValue),
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      badgeLabel: dto.badgeLabel?.trim() || null,
      status: ObjectiveStatus.ACTIVE,
      currentValue: 0,
      progressPercent: 0,
      achievedAt: null,
      archivedAt: null,
      createdByUserId: user.id,
      group: null,
      player,
    });

    const saved = await this.objectivesRepository.save(objective);
    await this.refreshForPlayers([player.id]);
    return this.findOneOrThrow(saved.id);
  }

  async createForGroup(
    groupId: string,
    dto: CreateGroupObjectiveDto,
    user: AuthenticatedUser,
  ): Promise<Objective> {
    this.assertCanManageGroup(user, groupId);
    this.assertValidPeriod(dto.periodStart, dto.periodEnd);

    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['players'],
    });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }
    const objective = this.objectivesRepository.create({
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      scope: ObjectiveScope.GROUP,
      metric: dto.metric,
      targetValue: this.toFixed2(dto.targetValue),
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      badgeLabel: dto.badgeLabel?.trim() || null,
      status: ObjectiveStatus.ACTIVE,
      currentValue: 0,
      progressPercent: 0,
      achievedAt: null,
      archivedAt: null,
      createdByUserId: user.id,
      player: null,
      group,
    });

    const saved = await this.objectivesRepository.save(objective);
    await this.refreshForGroups([group.id]);
    return this.findOneOrThrow(saved.id);
  }

  async findMy(user: AuthenticatedUser): Promise<Objective[]> {
    if (user.role === UserRole.ADMIN) {
      return this.objectivesRepository.find({
        relations: ['player', 'player.group', 'group'],
        order: { createdAt: 'DESC' },
      });
    }

    if (user.role === UserRole.COACH) {
      if (!user.groupIds?.length) return [];
      return this.objectivesRepository.find({
        where: [
          { player: { group: { id: In(user.groupIds) } } },
          { group: { id: In(user.groupIds) } },
        ],
        relations: ['player', 'player.group', 'group'],
        order: { createdAt: 'DESC' },
      });
    }

    if (user.role === UserRole.PLAYER) {
      if (!user.playerId) return [];
      const player = await this.findPlayerOrThrow(user.playerId);
      return this.findByScopeForPlayersAndGroups(
        [user.playerId],
        player.group?.id ? [player.group.id] : [],
      );
    }

    if (user.role === UserRole.PARENT) {
      const childIds = user.children?.map((child) => child.id) ?? [];
      if (childIds.length === 0) return [];
      const children = await this.playersRepository.find({
        where: { id: In(childIds) },
        relations: ['group'],
      });
      const childGroupIds = [
        ...new Set(children.map((child) => child.group?.id).filter(Boolean)),
      ] as string[];
      return this.findByScopeForPlayersAndGroups(childIds, childGroupIds);
    }

    return [];
  }

  async getSummaryForMy(user: AuthenticatedUser) {
    const objectives = await this.findMy(user);
    const achieved = objectives.filter(
      (o) => o.status === ObjectiveStatus.ACHIEVED,
    );

    return {
      activeCount: objectives.filter((o) => o.status === ObjectiveStatus.ACTIVE)
        .length,
      achievedCount: achieved.length,
      expiredCount: objectives.filter(
        (o) => o.status === ObjectiveStatus.EXPIRED,
      ).length,
      recentAchievements: achieved
        .filter((o) => o.achievedAt)
        .sort((a, b) => b.achievedAt!.getTime() - a.achievedAt!.getTime())
        .slice(0, 5)
        .map((o) => ({
          id: o.id,
          title: o.title,
          badgeLabel: o.badgeLabel,
          achievedAt: o.achievedAt!,
        })),
    };
  }

  async findByPlayerForUser(
    playerId: string,
    user: AuthenticatedUser,
  ): Promise<Objective[]> {
    const player = await this.findPlayerOrThrow(playerId);
    this.assertCanViewPlayer(user, player);

    return this.findByScopeForPlayersAndGroups(
      [playerId],
      player.group?.id ? [player.group.id] : [],
    );
  }

  async update(
    objectiveId: string,
    dto: UpdateObjectiveDto,
    user: AuthenticatedUser,
  ): Promise<Objective> {
    const objective = await this.findOneOrThrow(objectiveId);
    this.assertCanManageObjective(user, objective);

    if (dto.periodStart || dto.periodEnd) {
      const periodStart =
        dto.periodStart ?? objective.periodStart.toISOString();
      const periodEnd = dto.periodEnd ?? objective.periodEnd.toISOString();
      this.assertValidPeriod(periodStart, periodEnd);
      objective.periodStart = new Date(periodStart);
      objective.periodEnd = new Date(periodEnd);
    }

    if (dto.title !== undefined) objective.title = dto.title.trim();
    if (dto.description !== undefined)
      objective.description = dto.description?.trim() || null;
    if (dto.metric !== undefined) objective.metric = dto.metric;
    if (dto.targetValue !== undefined)
      objective.targetValue = this.toFixed2(dto.targetValue);
    if (dto.badgeLabel !== undefined)
      objective.badgeLabel = dto.badgeLabel?.trim() || null;
    if (dto.status !== undefined) {
      objective.status = dto.status;
      objective.archivedAt =
        dto.status === ObjectiveStatus.ARCHIVED ? new Date() : null;
    }

    await this.objectivesRepository.save(objective);
    await this.refreshByObjectiveScope(objective);
    return this.findOneOrThrow(objective.id);
  }

  async refreshForPlayers(playerIds: string[]): Promise<void> {
    const uniquePlayerIds = [...new Set(playerIds)].filter(Boolean);
    if (uniquePlayerIds.length === 0) return;

    const players = await this.playersRepository.find({
      where: { id: In(uniquePlayerIds) },
      relations: ['group'],
    });
    const groupIds = [
      ...new Set(players.map((player) => player.group?.id).filter(Boolean)),
    ] as string[];

    const where = [
      {
        player: { id: In(uniquePlayerIds) },
        status: In([
          ObjectiveStatus.ACTIVE,
          ObjectiveStatus.ACHIEVED,
          ObjectiveStatus.EXPIRED,
        ]),
      },
      ...(groupIds.length
        ? [
            {
              group: { id: In(groupIds) },
              status: In([
                ObjectiveStatus.ACTIVE,
                ObjectiveStatus.ACHIEVED,
                ObjectiveStatus.EXPIRED,
              ]),
            },
          ]
        : []),
    ];

    const objectives = await this.objectivesRepository.find({
      where,
      relations: ['player', 'group'],
    });

    if (objectives.length === 0) return;

    const now = new Date();
    for (const objective of objectives) {
      const currentValue = await this.calculateMetricValue(objective);
      objective.currentValue = this.toFixed2(currentValue);
      objective.progressPercent = this.toFixed2(
        this.calculateProgressPercent(currentValue, objective.targetValue),
      );

      if (objective.status === ObjectiveStatus.ARCHIVED) {
        continue;
      }

      if (currentValue >= Number(objective.targetValue)) {
        if (!objective.achievedAt) {
          objective.achievedAt = now;
        }
        objective.status = ObjectiveStatus.ACHIEVED;
      } else {
        objective.achievedAt = null;
        objective.status =
          now > objective.periodEnd
            ? ObjectiveStatus.EXPIRED
            : ObjectiveStatus.ACTIVE;
      }
    }

    await this.objectivesRepository.save(objectives);
  }

  async refreshForGroups(groupIds: string[]): Promise<void> {
    const uniqueGroupIds = [...new Set(groupIds)].filter(Boolean);
    if (uniqueGroupIds.length === 0) return;

    const objectives = await this.objectivesRepository.find({
      where: {
        group: { id: In(uniqueGroupIds) },
        status: In([
          ObjectiveStatus.ACTIVE,
          ObjectiveStatus.ACHIEVED,
          ObjectiveStatus.EXPIRED,
        ]),
      },
      relations: ['group'],
    });

    if (objectives.length === 0) return;

    const now = new Date();
    for (const objective of objectives) {
      const currentValue = await this.calculateMetricValue(objective);
      objective.currentValue = this.toFixed2(currentValue);
      objective.progressPercent = this.toFixed2(
        this.calculateProgressPercent(currentValue, objective.targetValue),
      );

      if (currentValue >= Number(objective.targetValue)) {
        if (!objective.achievedAt) {
          objective.achievedAt = now;
        }
        objective.status = ObjectiveStatus.ACHIEVED;
      } else {
        objective.achievedAt = null;
        objective.status =
          now > objective.periodEnd
            ? ObjectiveStatus.EXPIRED
            : ObjectiveStatus.ACTIVE;
      }
    }

    await this.objectivesRepository.save(objectives);
  }

  private async calculateMetricValue(objective: Objective): Promise<number> {
    const playerId = objective.player?.id;
    const groupId = objective.group?.id;
    const start = objective.periodStart;
    const end = objective.periodEnd;

    switch (objective.metric) {
      case ObjectiveMetric.ATTENDANCE_RATE: {
        const query = this.attendanceRepository
          .createQueryBuilder('a')
          .leftJoin('a.training', 't')
          .leftJoin('a.match', 'm')
          .select('COUNT(*)', 'total')
          .addSelect('SUM(CASE WHEN a.isPresent THEN 1 ELSE 0 END)', 'present')
          .andWhere(
            'COALESCE(t.startTime, m.startTime) BETWEEN :start AND :end',
            {
              start,
              end,
            },
          );
        if (objective.scope === ObjectiveScope.GROUP && groupId) {
          query.innerJoin('a.player', 'p').andWhere('p.groupId = :groupId', {
            groupId,
          });
        } else if (playerId) {
          query.andWhere('a.playerId = :playerId', { playerId });
        } else {
          throw new BadRequestException(
            `Objective ${objective.id} has invalid scope target`,
          );
        }

        const raw = await query.getRawOne<{ total: string; present: string | null }>();

        const total = Number(raw?.total || 0);
        const present = Number(raw?.present || 0);
        if (total === 0) return 0;
        return (present / total) * 100;
      }

      case ObjectiveMetric.CLEAN_SHEETS: {
        if (objective.scope === ObjectiveScope.GROUP && groupId) {
          return this.matchesRepository
            .createQueryBuilder('m')
            .where('m.groupId = :groupId', { groupId })
            .andWhere('m.homeGoals IS NOT NULL')
            .andWhere('m.awayGoals IS NOT NULL')
            .andWhere(
              '((m.isHome = true AND m.awayGoals = 0) OR (m.isHome = false AND m.homeGoals = 0))',
            )
            .andWhere('m.startTime BETWEEN :start AND :end', { start, end })
            .getCount();
        }

        if (playerId && objective.player) {
          if (!DEFENSIVE_POSITIONS.includes(objective.player.position)) {
            return 0;
          }

          return this.attendanceRepository
            .createQueryBuilder('a')
            .innerJoin('a.match', 'm')
            .where('a.playerId = :playerId', { playerId })
            .andWhere('a.isPresent = true')
            .andWhere('m.homeGoals IS NOT NULL')
            .andWhere('m.awayGoals IS NOT NULL')
            .andWhere(
              '((m.isHome = true AND m.awayGoals = 0) OR (m.isHome = false AND m.homeGoals = 0))',
            )
            .andWhere('m.startTime BETWEEN :start AND :end', { start, end })
            .getCount();
        }

        throw new BadRequestException(
          `Objective ${objective.id} has invalid scope target`,
        );
      }

      case ObjectiveMetric.GOALS: {
        const query = this.goalsRepository
          .createQueryBuilder('g')
          .innerJoin('g.match', 'm')
          .andWhere('g.isOwnGoal = false')
          .andWhere('m.startTime BETWEEN :start AND :end', { start, end });
        if (objective.scope === ObjectiveScope.GROUP && groupId) {
          query.innerJoin('g.scorer', 'scorer').andWhere(
            'scorer.groupId = :groupId',
            {
              groupId,
            },
          );
        } else if (playerId) {
          query.andWhere('g.scorerId = :playerId', { playerId });
        } else {
          throw new BadRequestException(
            `Objective ${objective.id} has invalid scope target`,
          );
        }
        return query.getCount();
      }

      case ObjectiveMetric.ASSISTS: {
        const query = this.goalsRepository
          .createQueryBuilder('g')
          .innerJoin('g.match', 'm')
          .andWhere('g.isOwnGoal = false')
          .andWhere('m.startTime BETWEEN :start AND :end', { start, end });
        if (objective.scope === ObjectiveScope.GROUP && groupId) {
          query.innerJoin('g.assist', 'assist').andWhere(
            'assist.groupId = :groupId',
            {
              groupId,
            },
          );
        } else if (playerId) {
          query.andWhere('g.assistId = :playerId', { playerId });
        } else {
          throw new BadRequestException(
            `Objective ${objective.id} has invalid scope target`,
          );
        }
        return query.getCount();
      }

      case ObjectiveMetric.GOAL_CONTRIBUTIONS: {
        const query = this.goalsRepository
          .createQueryBuilder('g')
          .innerJoin('g.match', 'm')
          .andWhere('g.isOwnGoal = false')
          .andWhere('m.startTime BETWEEN :start AND :end', { start, end });
        if (objective.scope === ObjectiveScope.GROUP && groupId) {
          query
            .leftJoin('g.scorer', 'scorer')
            .leftJoin('g.assist', 'assist')
            .andWhere('(scorer.groupId = :groupId OR assist.groupId = :groupId)', {
              groupId,
            });
        } else if (playerId) {
          query.andWhere('(g.scorerId = :playerId OR g.assistId = :playerId)', {
            playerId,
          });
        } else {
          throw new BadRequestException(
            `Objective ${objective.id} has invalid scope target`,
          );
        }
        return query.getCount();
      }

      case ObjectiveMetric.AVERAGE_RATING: {
        const query = this.evaluationsRepository
          .createQueryBuilder('e')
          .leftJoin('e.training', 't')
          .leftJoin('e.match', 'm')
          .select(
            'AVG((COALESCE(e.technical, 0) + COALESCE(e.tactical, 0) + COALESCE(e.physical, 0) + COALESCE(e.psychological, 0)) / 4.0)',
            'avg',
          )
          .andWhere(
            'COALESCE(t.startTime, m.startTime) BETWEEN :start AND :end',
            {
              start,
              end,
            },
          );
        if (objective.scope === ObjectiveScope.GROUP && groupId) {
          query.innerJoin('e.player', 'p').andWhere('p.groupId = :groupId', {
            groupId,
          });
        } else if (playerId) {
          query.andWhere('e.playerId = :playerId', { playerId });
        } else {
          throw new BadRequestException(
            `Objective ${objective.id} has invalid scope target`,
          );
        }

        const raw = await query.getRawOne<{ avg: string | null }>();

        return Number(raw?.avg || 0);
      }

      default:
        return 0;
    }
  }

  private calculateProgressPercent(
    currentValue: number,
    targetValue: number,
  ): number {
    if (targetValue <= 0) return 0;
    return Math.min((currentValue / targetValue) * 100, 100);
  }

  private async findByScopeForPlayersAndGroups(
    playerIds: string[],
    groupIds: string[],
  ): Promise<Objective[]> {
    if (playerIds.length === 0 && groupIds.length === 0) return [];

    const where = [
      ...(playerIds.length ? [{ player: { id: In(playerIds) } }] : []),
      ...(groupIds.length ? [{ group: { id: In(groupIds) } }] : []),
    ];

    return this.objectivesRepository.find({
      where,
      relations: ['player', 'player.group', 'group'],
      order: { createdAt: 'DESC' },
    });
  }

  private async findOneOrThrow(id: string): Promise<Objective> {
    const objective = await this.objectivesRepository.findOne({
      where: { id },
      relations: ['player', 'player.group', 'group'],
    });
    if (!objective) {
      throw new NotFoundException(`Objective with ID ${id} not found`);
    }
    return objective;
  }

  private async findPlayerOrThrow(playerId: string): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
      relations: ['group'],
    });
    if (!player) {
      throw new NotFoundException(`Player with ID ${playerId} not found`);
    }
    return player;
  }

  private assertValidPeriod(periodStart: string, periodEnd: string): void {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Objective period dates are invalid');
    }
    if (start >= end) {
      throw new BadRequestException('periodStart must be before periodEnd');
    }
  }

  private assertCanManageGroup(user: AuthenticatedUser, groupId: string): void {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.COACH && user.groupIds?.includes(groupId))
      return;
    throw new ForbiddenException(
      'You can only manage objectives for your own groups',
    );
  }

  private assertCanManagePlayer(user: AuthenticatedUser, player: Player): void {
    if (user.role === UserRole.ADMIN) return;
    if (
      user.role === UserRole.COACH &&
      player.group?.id &&
      user.groupIds?.includes(player.group.id)
    ) {
      return;
    }
    throw new ForbiddenException(
      'You can only manage objectives for your own players',
    );
  }

  private assertCanManageObjective(
    user: AuthenticatedUser,
    objective: Objective,
  ): void {
    if (objective.scope === ObjectiveScope.GROUP) {
      if (!objective.group?.id) {
        throw new BadRequestException(
          `Objective ${objective.id} has no target group`,
        );
      }
      this.assertCanManageGroup(user, objective.group.id);
      return;
    }

    if (!objective.player) {
      throw new BadRequestException(
        `Objective ${objective.id} has no target player`,
      );
    }
    this.assertCanManagePlayer(user, objective.player);
  }

  private async refreshByObjectiveScope(objective: Objective): Promise<void> {
    if (objective.scope === ObjectiveScope.GROUP) {
      if (!objective.group?.id) {
        throw new BadRequestException(
          `Objective ${objective.id} has no target group`,
        );
      }
      await this.refreshForGroups([objective.group.id]);
      return;
    }

    if (!objective.player?.id) {
      throw new BadRequestException(
        `Objective ${objective.id} has no target player`,
      );
    }
    await this.refreshForPlayers([objective.player.id]);
  }

  private assertCanViewPlayer(user: AuthenticatedUser, player: Player): void {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.PLAYER && user.playerId === player.id) return;
    if (user.role === UserRole.PARENT) {
      const childIds = user.children?.map((child) => child.id) ?? [];
      if (childIds.includes(player.id)) return;
    }
    if (
      user.role === UserRole.COACH &&
      player.group?.id &&
      user.groupIds?.includes(player.group.id)
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have access to this player objectives',
    );
  }

  private toFixed2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
