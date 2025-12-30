import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, MoreThanOrEqual, Between } from 'typeorm';
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
  StatsPeriod,
  PlayerStatsResponse,
  TeamStatsResponse,
  ChildrenStatsResponse,
} from './dto/player-stats.dto';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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

  private getDateRangeForPeriod(period: StatsPeriod): { start?: Date; end?: Date } {
    const now = new Date();

    switch (period) {
      case StatsPeriod.THIS_MONTH: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }
      case StatsPeriod.THIS_YEAR: {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end };
      }
      case StatsPeriod.ALL_TIME:
      default:
        return {};
    }
  }

  async getPlayerStats(
    playerId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<PlayerStatsResponse> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    const dateRange = this.getDateRangeForPeriod(period);

    // Count matches played (attendance with PRESENT or LATE status for matches)
    const matchesQuery = this.attendanceRepository
      .createQueryBuilder('a')
      .innerJoin('a.match', 'm')
      .where('a.player.id = :playerId', { playerId })
      .andWhere('a.match IS NOT NULL')
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AttendanceStatus.PRESENT, AttendanceStatus.LATE],
      });

    if (dateRange.start && dateRange.end) {
      matchesQuery.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const matchesPlayed = await matchesQuery.getCount();

    // Count goals (excluding own goals)
    const goalsQuery = this.goalsRepository
      .createQueryBuilder('g')
      .innerJoin('g.match', 'm')
      .where('g.scorer.id = :playerId', { playerId })
      .andWhere('g.isOwnGoal = false');

    if (dateRange.start && dateRange.end) {
      goalsQuery.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const goals = await goalsQuery.getCount();

    // Count assists
    const assistsQuery = this.goalsRepository
      .createQueryBuilder('g')
      .innerJoin('g.match', 'm')
      .where('g.assist.id = :playerId', { playerId });

    if (dateRange.start && dateRange.end) {
      assistsQuery.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const assists = await assistsQuery.getCount();

    return {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      matchesPlayed,
      goals,
      assists,
      period,
    };
  }

  async getMyStats(
    userId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<PlayerStatsResponse> {
    const player = await this.playersRepository
      .createQueryBuilder('player')
      .innerJoin('player.user', 'user')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!player) {
      throw new NotFoundException('Player profile not found');
    }

    return this.getPlayerStats(player.id, period);
  }

  async getTeamStats(
    userId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<TeamStatsResponse[]> {
    // Find coach and their groups
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

    // Get all groups with players
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

      // Sort by goals, then assists
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
    // Find parent by user ID
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

    // If no children, return empty
    if (children.length === 0) {
      return { children: [], stats: null };
    }

    // If childId specified, use it; otherwise use first child
    const selectedChildId = childId || children[0].id;

    // Verify the child belongs to this parent
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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userId = player.user?.id;

      // First, break the bidirectional reference from User to Player
      if (userId) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(User)
          .set({ player: null as unknown as Player })
          .where('id = :userId', { userId })
          .execute();
      }

      // Now we can safely remove the player
      await queryRunner.manager.remove(player);

      // Finally delete the user
      if (userId) {
        await queryRunner.manager.delete(User, userId);
      }

      await queryRunner.commitTransaction();
    } catch {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Failed to delete player');
    } finally {
      await queryRunner.release();
    }
  }

  async create(createPlayerDto: CreatePlayerDto): Promise<Player> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if email already exists
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: createPlayerDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createPlayerDto.password, 10);

      // Create User
      const user = queryRunner.manager.create(User, {
        email: createPlayerDto.email,
        passwordHash: hashedPassword,
        role: UserRole.PLAYER,
        firstName: createPlayerDto.firstName,
        lastName: createPlayerDto.lastName,
      });

      await queryRunner.manager.save(user);

      // Create Player Profile (parent is null initially)
      const player = queryRunner.manager.create(Player, {
        position: createPlayerDto.position,
        height: createPlayerDto.height,
        weight: createPlayerDto.weight,
        strongFoot: createPlayerDto.strongFoot,
        firstName: createPlayerDto.firstName,
        lastName: createPlayerDto.lastName,
        phoneNumber: createPlayerDto.phoneNumber,
        dateOfBirth: new Date(createPlayerDto.dateOfBirth),
        user,
        // parent is nullable and will be null by default
      });

      await queryRunner.manager.save(player);

      // Link User to Player
      user.player = player;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      return player;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create player');
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, updatePlayerDto: UpdatePlayerDto): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update User fields if provided
      if (player.user) {
        if (updatePlayerDto.email !== undefined) {
          const existingUser = await queryRunner.manager.findOne(User, {
            where: { email: updatePlayerDto.email },
          });
          if (existingUser && existingUser.id !== player.user.id) {
            throw new ConflictException('Email already exists');
          }
          player.user.email = updatePlayerDto.email;
        }

        if (updatePlayerDto.password !== undefined) {
          player.user.passwordHash = await bcrypt.hash(updatePlayerDto.password, 10);
        }

        if (updatePlayerDto.firstName !== undefined) {
          player.user.firstName = updatePlayerDto.firstName;
        }

        if (updatePlayerDto.lastName !== undefined) {
          player.user.lastName = updatePlayerDto.lastName;
        }

        await queryRunner.manager.save(player.user);
      }

      // Update Player fields
      if (updatePlayerDto.firstName !== undefined) {
        player.firstName = updatePlayerDto.firstName;
      }

      if (updatePlayerDto.lastName !== undefined) {
        player.lastName = updatePlayerDto.lastName;
      }

      if (updatePlayerDto.phoneNumber !== undefined) {
        player.phoneNumber = updatePlayerDto.phoneNumber;
      }

      if (updatePlayerDto.dateOfBirth !== undefined) {
        player.dateOfBirth = new Date(updatePlayerDto.dateOfBirth);
      }

      if (updatePlayerDto.position !== undefined) {
        player.position = updatePlayerDto.position;
      }

      if (updatePlayerDto.height !== undefined) {
        player.height = updatePlayerDto.height;
      }

      if (updatePlayerDto.weight !== undefined) {
        player.weight = updatePlayerDto.weight;
      }

      if (updatePlayerDto.strongFoot !== undefined) {
        player.strongFoot = updatePlayerDto.strongFoot;
      }

      await queryRunner.manager.save(player);
      await queryRunner.commitTransaction();

      return player;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to update player');
    } finally {
      await queryRunner.release();
    }
  }
}
