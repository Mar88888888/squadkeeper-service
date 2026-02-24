import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Player } from './entities/player.entity';
import { User } from '../users/entities/user.entity';
import { Goal } from '../events/entities/goal.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Group } from '../groups/entities/group.entity';
import { Parent } from '../parents/entities/parent.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import {
  PlayerStatsResponse,
  TeamStatsResponse,
  ChildrenStatsResponse,
  ChildInfo,
} from './dto/player-stats.dto';
import { StatsPeriod } from '../common/enums/stats-period.enum';
import { Position, DEFENSIVE_POSITIONS } from './enums/position.enum';
import {
  getDateRangeForPeriod,
  DateRange,
} from '../common/utils/date-range.util';
import { calculateAttendanceRate } from '../common/utils/attendance.util';

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  rate: number;
  totalTrainings: number;
  totalMatches: number;
}

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);

  constructor(
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    private dataSource: DataSource,
  ) {}

  private syncPersonNames(
    player: Player,
    user: User,
    data: { firstName?: string; lastName?: string },
  ): void {
    if (data.firstName !== undefined) {
      player.firstName = data.firstName;
      user.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      player.lastName = data.lastName;
      user.lastName = data.lastName;
    }
  }

  async findOne(playerId: string): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    return player;
  }

  async findByIds(ids: string[]): Promise<Player[]> {
    if (ids.length === 0) return [];

    const players = await this.playersRepository.find({
      where: { id: In(ids) },
    });

    if (players.length !== ids.length) {
      const foundIds = new Set(players.map((p) => p.id));
      const missingIds = ids.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Players with IDs ${missingIds.join(', ')} not found`,
      );
    }

    return players;
  }

  async assignToGroup(playerIds: string[], groupId: string): Promise<void> {
    if (playerIds.length === 0) return;

    await this.findByIds(playerIds);
    await this.playersRepository.update(
      { id: In(playerIds) },
      { group: { id: groupId } },
    );
  }

  async removeFromGroup(playerIds: string[], groupId?: string): Promise<void> {
    if (playerIds.length === 0 && !groupId) return;

    const query = this.playersRepository.createQueryBuilder().update(Player);

    if (playerIds.length > 0 && groupId) {
      query
        .set({ group: null })
        .where('id IN (:...playerIds)', { playerIds })
        .andWhere('groupId = :groupId', { groupId });
    } else if (groupId) {
      query.set({ group: null }).where('groupId = :groupId', { groupId });
    }

    await query.execute();
  }

  async findOneWithParent(playerId: string): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
      relations: ['parent'],
    });

    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    return player;
  }

  async setParent(playerId: string, parent: Parent | null): Promise<void> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    player.parent = parent;
    await this.playersRepository.save(player);
  }

  async findByUserId(userId: string): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: { user: { id: userId } },
      relations: ['group'],
    });

    if (!player) {
      throw new NotFoundException('Player profile not found');
    }

    return player;
  }

  private async getMatchesPlayedCount(
    playerId: string,
    dateRange: DateRange,
  ): Promise<number> {
    const query = this.attendanceRepository
      .createQueryBuilder('a')
      .innerJoin('a.match', 'm')
      .where('a.player.id = :playerId', { playerId })
      .andWhere('a.match IS NOT NULL')
      .andWhere('a.isPresent = true');

    if (dateRange.start && dateRange.end) {
      query.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    return query.getCount();
  }

  private async getGoalsCount(
    playerId: string,
    dateRange: DateRange,
  ): Promise<number> {
    const query = this.goalsRepository
      .createQueryBuilder('g')
      .innerJoin('g.match', 'm')
      .where('g.scorer.id = :playerId', { playerId })
      .andWhere('g.isOwnGoal = false');

    if (dateRange.start && dateRange.end) {
      query.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    return query.getCount();
  }

  private async getAssistsCount(
    playerId: string,
    dateRange: DateRange,
  ): Promise<number> {
    const query = this.goalsRepository
      .createQueryBuilder('g')
      .innerJoin('g.match', 'm')
      .where('g.assist.id = :playerId', { playerId });

    if (dateRange.start && dateRange.end) {
      query.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    return query.getCount();
  }

  private async getCleanSheetsCount(
    playerId: string,
    position: Position,
    dateRange: DateRange,
  ): Promise<number> {
    if (!DEFENSIVE_POSITIONS.includes(position)) {
      return 0;
    }

    const query = this.attendanceRepository
      .createQueryBuilder('a')
      .innerJoin('a.match', 'm')
      .where('a.player.id = :playerId', { playerId })
      .andWhere('a.match IS NOT NULL')
      .andWhere('a.isPresent = true')
      .andWhere('m.homeGoals IS NOT NULL')
      .andWhere('m.awayGoals IS NOT NULL')
      .andWhere(
        '((m.isHome = true AND m.awayGoals = 0) OR (m.isHome = false AND m.homeGoals = 0))',
      );

    if (dateRange.start && dateRange.end) {
      query.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    return query.getCount();
  }

  private async getAttendanceStats(
    playerId: string,
    dateRange: DateRange,
  ): Promise<AttendanceStats> {
    const query = this.attendanceRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.training', 't')
      .leftJoinAndSelect('a.match', 'm')
      .where('a.player.id = :playerId', { playerId });

    if (dateRange.start && dateRange.end) {
      query.andWhere(
        '((t.startTime BETWEEN :start AND :end) OR (m.startTime BETWEEN :start AND :end))',
        { start: dateRange.start, end: dateRange.end },
      );
    }

    const allAttendances = await query.getMany();

    const stats: AttendanceStats = {
      total: allAttendances.length,
      present: 0,
      absent: 0,
      rate: 0,
      totalTrainings: 0,
      totalMatches: 0,
    };

    for (const attendance of allAttendances) {
      if (attendance.training) stats.totalTrainings++;
      if (attendance.match) stats.totalMatches++;

      if (attendance.isPresent) {
        stats.present++;
      } else {
        stats.absent++;
      }
    }

    calculateAttendanceRate(stats);

    return stats;
  }

  private async getMatchesPlayedCountBatch(
    playerIds: string[],
    dateRange: DateRange,
  ): Promise<Map<string, number>> {
    if (playerIds.length === 0) return new Map();

    const query = this.attendanceRepository
      .createQueryBuilder('a')
      .select('a.playerId', 'playerId')
      .addSelect('COUNT(*)', 'count')
      .innerJoin('a.match', 'm')
      .where('a.playerId IN (:...playerIds)', { playerIds })
      .andWhere('a.isPresent = true')
      .groupBy('a.playerId');

    if (dateRange.start && dateRange.end) {
      query.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const results = await query.getRawMany();
    return new Map(results.map((r) => [r.playerId, parseInt(r.count)]));
  }

  private async getGoalsCountBatch(
    playerIds: string[],
    dateRange: DateRange,
  ): Promise<Map<string, number>> {
    if (playerIds.length === 0) return new Map();

    const query = this.goalsRepository
      .createQueryBuilder('g')
      .select('g.scorerId', 'playerId')
      .addSelect('COUNT(*)', 'count')
      .innerJoin('g.match', 'm')
      .where('g.scorerId IN (:...playerIds)', { playerIds })
      .andWhere('g.isOwnGoal = false')
      .groupBy('g.scorerId');

    if (dateRange.start && dateRange.end) {
      query.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const results = await query.getRawMany();
    return new Map(results.map((r) => [r.playerId, parseInt(r.count)]));
  }

  private async getAssistsCountBatch(
    playerIds: string[],
    dateRange: DateRange,
  ): Promise<Map<string, number>> {
    if (playerIds.length === 0) return new Map();

    const query = this.goalsRepository
      .createQueryBuilder('g')
      .select('g.assistId', 'playerId')
      .addSelect('COUNT(*)', 'count')
      .innerJoin('g.match', 'm')
      .where('g.assistId IN (:...playerIds)', { playerIds })
      .groupBy('g.assistId');

    if (dateRange.start && dateRange.end) {
      query.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const results = await query.getRawMany();
    return new Map(results.map((r) => [r.playerId, parseInt(r.count)]));
  }

  private async getCleanSheetsCountBatch(
    defensivePlayerIds: string[],
    dateRange: DateRange,
  ): Promise<Map<string, number>> {
    if (defensivePlayerIds.length === 0) return new Map();

    const query = this.attendanceRepository
      .createQueryBuilder('a')
      .select('a.playerId', 'playerId')
      .addSelect('COUNT(*)', 'count')
      .innerJoin('a.match', 'm')
      .where('a.playerId IN (:...playerIds)', { playerIds: defensivePlayerIds })
      .andWhere('a.isPresent = true')
      .andWhere('m.homeGoals IS NOT NULL')
      .andWhere('m.awayGoals IS NOT NULL')
      .andWhere(
        '((m.isHome = true AND m.awayGoals = 0) OR (m.isHome = false AND m.homeGoals = 0))',
      )
      .groupBy('a.playerId');

    if (dateRange.start && dateRange.end) {
      query.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const results = await query.getRawMany();
    return new Map(results.map((r) => [r.playerId, parseInt(r.count)]));
  }

  private async getAttendanceStatsBatch(
    playerIds: string[],
    dateRange: DateRange,
  ): Promise<Map<string, AttendanceStats>> {
    if (playerIds.length === 0) return new Map();

    const attendances = await this.attendanceRepository.find({
      where: { player: { id: In(playerIds) } },
      relations: ['player', 'training', 'match'],
    });

    // Filter by date range if specified
    const { start, end } = dateRange;
    const filtered =
      start && end
        ? attendances.filter((a) => {
            const eventTime = a.training?.startTime || a.match?.startTime;
            return eventTime && eventTime >= start && eventTime <= end;
          })
        : attendances;

    // Group by player and calculate stats
    const statsMap = new Map<string, AttendanceStats>();

    // Initialize stats for all players (including those with no attendance)
    for (const playerId of playerIds) {
      statsMap.set(playerId, {
        total: 0,
        present: 0,
        absent: 0,
        rate: 0,
        totalTrainings: 0,
        totalMatches: 0,
      });
    }

    for (const attendance of filtered) {
      const playerId = attendance.player.id;
      const stats = statsMap.get(playerId)!;

      stats.total++;
      if (attendance.training) stats.totalTrainings++;
      if (attendance.match) stats.totalMatches++;
      if (attendance.isPresent) stats.present++;
      else stats.absent++;
    }

    // Calculate rates
    for (const stats of statsMap.values()) {
      calculateAttendanceRate(stats);
    }

    return statsMap;
  }

  private async getPlayerStatsBatch(
    players: Player[],
    period: StatsPeriod,
  ): Promise<Map<string, PlayerStatsResponse>> {
    if (players.length === 0) return new Map();

    const playerIds = players.map((p) => p.id);
    const defensivePlayerIds = players
      .filter((p) => DEFENSIVE_POSITIONS.includes(p.position))
      .map((p) => p.id);

    const dateRange = getDateRangeForPeriod(period);

    const [matchesPlayed, goals, assists, cleanSheets, attendance] =
      await Promise.all([
        this.getMatchesPlayedCountBatch(playerIds, dateRange),
        this.getGoalsCountBatch(playerIds, dateRange),
        this.getAssistsCountBatch(playerIds, dateRange),
        this.getCleanSheetsCountBatch(defensivePlayerIds, dateRange),
        this.getAttendanceStatsBatch(playerIds, dateRange),
      ]);

    const result = new Map<string, PlayerStatsResponse>();

    for (const player of players) {
      result.set(player.id, {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        matchesPlayed: matchesPlayed.get(player.id) || 0,
        goals: goals.get(player.id) || 0,
        assists: assists.get(player.id) || 0,
        cleanSheets: cleanSheets.get(player.id) || 0,
        attendance: attendance.get(player.id) || {
          total: 0,
          present: 0,
          absent: 0,
          rate: 0,
          totalTrainings: 0,
          totalMatches: 0,
        },
        period,
      });
    }

    return result;
  }

  async getPlayerStats(
    playerId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<PlayerStatsResponse> {
    const player = await this.findOne(playerId);
    const dateRange = getDateRangeForPeriod(period);

    const [matchesPlayed, goals, assists, cleanSheets, attendance] =
      await Promise.all([
        this.getMatchesPlayedCount(playerId, dateRange),
        this.getGoalsCount(playerId, dateRange),
        this.getAssistsCount(playerId, dateRange),
        this.getCleanSheetsCount(playerId, player.position, dateRange),
        this.getAttendanceStats(playerId, dateRange),
      ]);

    return {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      matchesPlayed,
      goals,
      assists,
      cleanSheets,
      attendance,
      period,
    };
  }

  async getTeamStats(
    groupIds: string[],
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<TeamStatsResponse[]> {
    if (groupIds.length === 0) {
      return [];
    }

    const groups = await this.groupsRepository.find({
      where: { id: In(groupIds) },
      relations: ['players'],
      order: { name: 'ASC' },
    });

    // Collect all players across all groups
    const allPlayers = groups.flatMap((g) => g.players);

    // Batch fetch all stats
    const statsMap = await this.getPlayerStatsBatch(allPlayers, period);

    return groups.map((group) => {
      const playerStats = group.players
        .map((player) => statsMap.get(player.id)!)
        .sort((a, b) => {
          if (b.goals !== a.goals) return b.goals - a.goals;
          return b.assists - a.assists;
        });

      return {
        groupId: group.id,
        groupName: group.name,
        players: playerStats,
        period,
      };
    });
  }

  async getChildrenStats(
    childrenIds: string[],
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<ChildrenStatsResponse> {
    if (childrenIds.length === 0) {
      return { children: [] };
    }

    const players = await this.playersRepository.find({
      where: { id: In(childrenIds) },
      relations: ['group'],
      order: { firstName: 'ASC' },
    });

    // Batch fetch all stats
    const statsMap = await this.getPlayerStatsBatch(players, period);

    const children: ChildInfo[] = players.map((child) => ({
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      groupId: child.group?.id || null,
      stats: statsMap.get(child.id) || null,
    }));

    return { children };
  }

  async findAll(): Promise<Player[]> {
    return this.playersRepository.find({
      relations: ['user', 'group', 'parent'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async remove(id: string): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const player = await manager.findOne(Player, {
          where: { id },
          relations: ['user'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!player) return;

        const userId = player.user?.id;

        await manager.remove(player);

        if (userId) {
          await manager.delete(User, userId);
        }
      });
    } catch (error) {
      this.logger.error('Failed to delete player', error);
      throw new BadRequestException('Failed to delete player');
    }
  }

  async create(createPlayerDto: CreatePlayerDto): Promise<Player> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existingUser = await manager.findOne(User, {
          where: { email: createPlayerDto.email },
        });

        if (existingUser) {
          throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(createPlayerDto.password, 10);

        const user = manager.create(User, {
          email: createPlayerDto.email,
          passwordHash: hashedPassword,
          role: UserRole.PLAYER,
        });

        const player = manager.create(Player, {
          position: createPlayerDto.position,
          height: createPlayerDto.height,
          weight: createPlayerDto.weight,
          strongFoot: createPlayerDto.strongFoot,
          phoneNumber: createPlayerDto.phoneNumber,
          dateOfBirth: new Date(createPlayerDto.dateOfBirth),
          user,
        });

        this.syncPersonNames(player, user, {
          firstName: createPlayerDto.firstName,
          lastName: createPlayerDto.lastName,
        });

        await manager.save(user);
        await manager.save(player);

        return player;
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Failed to create player', error);
      throw new BadRequestException('Failed to create player');
    }
  }

  async update(id: string, updatePlayerDto: UpdatePlayerDto): Promise<Player> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const player = await manager.findOne(Player, {
          where: { id },
          relations: ['user', 'group', 'parent'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!player) {
          throw new NotFoundException('Player not found');
        }

        const { email, password, firstName, lastName } = updatePlayerDto;

        if (player.user) {
          if (email !== undefined && email !== player.user.email) {
            const existingUser = await manager.findOne(User, {
              where: { email },
            });
            if (existingUser) {
              throw new ConflictException('Email already exists');
            }
            player.user.email = email;
          }

          if (password !== undefined) {
            player.user.passwordHash = await bcrypt.hash(password, 10);
          }
        }

        this.syncPersonNames(player, player.user, { firstName, lastName });

        if (updatePlayerDto.phoneNumber !== undefined)
          player.phoneNumber = updatePlayerDto.phoneNumber;
        if (updatePlayerDto.dateOfBirth !== undefined)
          player.dateOfBirth = new Date(updatePlayerDto.dateOfBirth);
        if (updatePlayerDto.position !== undefined)
          player.position = updatePlayerDto.position;
        if (updatePlayerDto.height !== undefined)
          player.height = updatePlayerDto.height;
        if (updatePlayerDto.weight !== undefined)
          player.weight = updatePlayerDto.weight;
        if (updatePlayerDto.strongFoot !== undefined)
          player.strongFoot = updatePlayerDto.strongFoot;

        await manager.save([player.user, player]);

        return player;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ConflictException) throw error;
      this.logger.error('Failed to update player', error);
      throw new BadRequestException('Failed to update player');
    }
  }
}
