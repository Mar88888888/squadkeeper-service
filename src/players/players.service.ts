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
import { Coach } from '../coaches/entities/coach.entity';
import { Group } from '../groups/entities/group.entity';
import { Parent } from '../parents/entities/parent.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { AttendanceStatus } from '../attendance/enums/attendance-status.enum';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import {
  PlayerStatsResponse,
  TeamStatsResponse,
  ChildrenStatsResponse,
} from './dto/player-stats.dto';
import { StatsPeriod } from '../common/enums/stats-period.enum';
import { Position, DEFENSIVE_POSITIONS } from './enums/position.enum';
import { getDateRangeForPeriod, DateRange } from '../common/utils/date-range.util';
import { calculateAttendanceRate } from '../common/utils/attendance.util';

interface AttendanceStats {
  total: number;
  present: number;
  late: number;
  benched: number;
  absent: number;
  sick: number;
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
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(Parent)
    private parentsRepository: Repository<Parent>,
    private dataSource: DataSource,
  ) {}

  private async findPlayerById(playerId: string): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    return player;
  }

  async findPlayerByUserId(userId: string): Promise<Player> {
    const player = await this.playersRepository
      .createQueryBuilder('player')
      .innerJoin('player.user', 'user')
      .where('user.id = :userId', { userId })
      .getOne();

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
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AttendanceStatus.PRESENT, AttendanceStatus.LATE],
      });

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
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AttendanceStatus.PRESENT, AttendanceStatus.LATE],
      })
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
      .leftJoin('a.training', 't')
      .leftJoin('a.match', 'm')
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
      late: 0,
      benched: 0,
      absent: 0,
      sick: 0,
      rate: 0,
      totalTrainings: 0,
      totalMatches: 0,
    };

    for (const a of allAttendances) {
      if (a.training) stats.totalTrainings++;
      if (a.match) stats.totalMatches++;

      switch (a.status) {
        case AttendanceStatus.PRESENT:
          stats.present++;
          break;
        case AttendanceStatus.LATE:
          stats.late++;
          break;
        case AttendanceStatus.BENCHED:
          stats.benched++;
          break;
        case AttendanceStatus.ABSENT:
          stats.absent++;
          break;
        case AttendanceStatus.SICK:
          stats.sick++;
          break;
      }
    }

    calculateAttendanceRate(stats);

    return stats;
  }

  async getPlayerStats(
    playerId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<PlayerStatsResponse> {
    const player = await this.findPlayerById(playerId);
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
    userId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<TeamStatsResponse[]> {
    const coach = await this.coachesRepository.findOne({
      where: { user: { id: userId } },
      relations: ['headGroups', 'assistantGroups'],
    });

    if (!coach) {
      throw new NotFoundException('Coach profile not found');
    }

    const groupIds = [
      ...coach.headGroups.map((g) => g.id),
      ...coach.assistantGroups.map((g) => g.id),
    ];

    if (groupIds.length === 0) {
      return [];
    }

    const groups = await this.groupsRepository.find({
      where: { id: In(groupIds) },
      relations: ['players'],
      order: { name: 'ASC' },
    });

    const result: TeamStatsResponse[] = [];

    for (const group of groups) {
      const playerStats: PlayerStatsResponse[] = [];

      for (const player of group.players) {
        const stats = await this.getPlayerStats(player.id, period);
        playerStats.push(stats);
      }

      playerStats.sort((a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals;
        return b.assists - a.assists;
      });

      result.push({
        groupId: group.id,
        groupName: group.name,
        players: playerStats,
        period,
      });
    }

    return result;
  }

  async getChildrenStats(
    userId: string,
    childId?: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<ChildrenStatsResponse> {
    const parent = await this.parentsRepository
      .createQueryBuilder('parent')
      .innerJoin('parent.user', 'user')
      .leftJoinAndSelect('parent.children', 'children')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!parent) {
      throw new NotFoundException('Parent profile not found');
    }

    const children = parent.children.map((child) => ({
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
    }));

    if (children.length === 0) {
      return { children: [], stats: null };
    }

    const selectedChildId = childId || children[0].id;

    const isValidChild = children.some((c) => c.id === selectedChildId);
    if (!isValidChild) {
      throw new BadRequestException('Child does not belong to this parent');
    }

    const stats = await this.getPlayerStats(selectedChildId, period);

    return { children, stats };
  }

  async findAll(): Promise<Player[]> {
    return this.playersRepository.find({
      relations: ['user', 'group', 'parent'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async remove(id: string): Promise<void> {
    const player = await this.playersRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        const userId = player.user?.id;

        if (userId) {
          await manager
            .createQueryBuilder()
            .update(User)
            .set({ player: null as unknown as Player })
            .where('id = :userId', { userId })
            .execute();
        }

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
          firstName: createPlayerDto.firstName,
          lastName: createPlayerDto.lastName,
        });

        await manager.save(user);

        const player = manager.create(Player, {
          position: createPlayerDto.position,
          height: createPlayerDto.height,
          weight: createPlayerDto.weight,
          strongFoot: createPlayerDto.strongFoot,
          firstName: createPlayerDto.firstName,
          lastName: createPlayerDto.lastName,
          phoneNumber: createPlayerDto.phoneNumber,
          dateOfBirth: new Date(createPlayerDto.dateOfBirth),
          user,
        });

        await manager.save(player);

        user.player = player;
        await manager.save(user);

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
    const player = await this.playersRepository.findOne({
      where: { id },
      relations: ['user', 'group', 'parent'],
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const { email, password, firstName, lastName } = updatePlayerDto;

        if (player.user) {
          if (email !== undefined && email !== player.user.email) {
            const existingUser = await manager.findOne(User, { where: { email } });
            if (existingUser) {
              throw new ConflictException('Email already exists');
            }
            player.user.email = email;
          }

          if (password !== undefined) {
            player.user.passwordHash = await bcrypt.hash(password, 10);
          }
          if (firstName !== undefined) player.user.firstName = firstName;
          if (lastName !== undefined) player.user.lastName = lastName;

          await manager.save(player.user);
        }

        if (firstName !== undefined) player.firstName = firstName;
        if (lastName !== undefined) player.lastName = lastName;
        if (updatePlayerDto.phoneNumber !== undefined) player.phoneNumber = updatePlayerDto.phoneNumber;
        if (updatePlayerDto.dateOfBirth !== undefined) player.dateOfBirth = new Date(updatePlayerDto.dateOfBirth);
        if (updatePlayerDto.position !== undefined) player.position = updatePlayerDto.position;
        if (updatePlayerDto.height !== undefined) player.height = updatePlayerDto.height;
        if (updatePlayerDto.weight !== undefined) player.weight = updatePlayerDto.weight;
        if (updatePlayerDto.strongFoot !== undefined) player.strongFoot = updatePlayerDto.strongFoot;

        await manager.save(player);

        return player;
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error('Failed to update player', error);
      throw new BadRequestException('Failed to update player');
    }
  }
}
