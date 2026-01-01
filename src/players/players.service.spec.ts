import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PlayersService } from './players.service';
import { Player } from './entities/player.entity';
import { User } from '../users/entities/user.entity';
import { Goal } from '../events/entities/goal.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Group } from '../groups/entities/group.entity';
import { Parent } from '../parents/entities/parent.entity';
import { StatsPeriod } from './dto/player-stats.dto';
import { UserRole } from '../users/enums/user-role.enum';

jest.mock('bcrypt');

describe('PlayersService', () => {
  let service: PlayersService;
  let playersRepository: jest.Mocked<Repository<Player>>;
  let goalsRepository: jest.Mocked<Repository<Goal>>;
  let attendanceRepository: jest.Mocked<Repository<Attendance>>;
  let coachesRepository: jest.Mocked<Repository<Coach>>;
  let groupsRepository: jest.Mocked<Repository<Group>>;
  let parentsRepository: jest.Mocked<Repository<Parent>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockPlayer = {
    id: 'player-123',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+380501234567',
    dateOfBirth: new Date('2010-05-15'),
    position: 'Forward',
    height: 165,
    weight: 55,
    strongFoot: 'right',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Player;

  const mockUser = {
    id: 'user-123',
    email: 'player@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PLAYER,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;

  const createMockQueryBuilder = () => ({
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getCount: jest.fn(),
  });

  let mockQueryRunner: any;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
        delete: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn(),
        }),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const mockPlayersRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockUsersRepository = {
      findOne: jest.fn(),
    };

    const mockGoalsRepository = {
      createQueryBuilder: jest.fn(),
    };

    const mockAttendanceRepository = {
      createQueryBuilder: jest.fn(),
    };

    const mockCoachesRepository = {
      findOne: jest.fn(),
    };

    const mockGroupsRepository = {
      find: jest.fn(),
    };

    const mockParentsRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersService,
        { provide: getRepositoryToken(Player), useValue: mockPlayersRepository },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: getRepositoryToken(Goal), useValue: mockGoalsRepository },
        { provide: getRepositoryToken(Attendance), useValue: mockAttendanceRepository },
        { provide: getRepositoryToken(Coach), useValue: mockCoachesRepository },
        { provide: getRepositoryToken(Group), useValue: mockGroupsRepository },
        { provide: getRepositoryToken(Parent), useValue: mockParentsRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
    playersRepository = module.get(getRepositoryToken(Player));
    goalsRepository = module.get(getRepositoryToken(Goal));
    attendanceRepository = module.get(getRepositoryToken(Attendance));
    coachesRepository = module.get(getRepositoryToken(Coach));
    groupsRepository = module.get(getRepositoryToken(Group));
    parentsRepository = module.get(getRepositoryToken(Parent));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all players with relations', async () => {
      const players = [mockPlayer, { ...mockPlayer, id: 'player-456' }] as unknown as Player[];
      playersRepository.find.mockResolvedValue(players);

      const result = await service.findAll();

      expect(playersRepository.find).toHaveBeenCalledWith({
        relations: ['user', 'group', 'parent'],
        order: { lastName: 'ASC', firstName: 'ASC' },
      });
      expect(result).toEqual(players);
    });

    it('should return empty array when no players exist', async () => {
      playersRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('getPlayerStats', () => {
    it('should return player stats for ALL_TIME period', async () => {
      playersRepository.findOne.mockResolvedValue(mockPlayer);

      const mockAttendanceQb = createMockQueryBuilder();
      mockAttendanceQb.getCount.mockResolvedValue(10);
      attendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as unknown as SelectQueryBuilder<Attendance>);

      const mockGoalsQb = createMockQueryBuilder();
      mockGoalsQb.getCount.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
      goalsRepository.createQueryBuilder.mockReturnValue(mockGoalsQb as unknown as SelectQueryBuilder<Goal>);

      const result = await service.getPlayerStats('player-123', StatsPeriod.ALL_TIME);

      expect(playersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'player-123' },
      });
      expect(result).toEqual({
        playerId: 'player-123',
        playerName: 'John Doe',
        matchesPlayed: 10,
        goals: 5,
        assists: 3,
        period: StatsPeriod.ALL_TIME,
      });
    });

    it('should throw NotFoundException when player not found', async () => {
      playersRepository.findOne.mockResolvedValue(null);

      await expect(service.getPlayerStats('nonexistent', StatsPeriod.ALL_TIME))
        .rejects.toThrow(NotFoundException);
    });

    it('should filter by date range for THIS_MONTH period', async () => {
      playersRepository.findOne.mockResolvedValue(mockPlayer);

      const mockAttendanceQb = createMockQueryBuilder();
      mockAttendanceQb.getCount.mockResolvedValue(2);
      attendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as unknown as SelectQueryBuilder<Attendance>);

      const mockGoalsQb = createMockQueryBuilder();
      mockGoalsQb.getCount.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      goalsRepository.createQueryBuilder.mockReturnValue(mockGoalsQb as unknown as SelectQueryBuilder<Goal>);

      const result = await service.getPlayerStats('player-123', StatsPeriod.THIS_MONTH);

      expect(result.period).toBe(StatsPeriod.THIS_MONTH);
      expect(mockAttendanceQb.andWhere).toHaveBeenCalled();
    });

    it('should filter by date range for THIS_YEAR period', async () => {
      playersRepository.findOne.mockResolvedValue(mockPlayer);

      const mockAttendanceQb = createMockQueryBuilder();
      mockAttendanceQb.getCount.mockResolvedValue(50);
      attendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as unknown as SelectQueryBuilder<Attendance>);

      const mockGoalsQb = createMockQueryBuilder();
      mockGoalsQb.getCount.mockResolvedValueOnce(20).mockResolvedValueOnce(10);
      goalsRepository.createQueryBuilder.mockReturnValue(mockGoalsQb as unknown as SelectQueryBuilder<Goal>);

      const result = await service.getPlayerStats('player-123', StatsPeriod.THIS_YEAR);

      expect(result.period).toBe(StatsPeriod.THIS_YEAR);
    });
  });

  describe('getMyStats', () => {
    it('should return stats for current player user', async () => {
      const mockPlayerQb = createMockQueryBuilder();
      mockPlayerQb.getOne.mockResolvedValue(mockPlayer);
      playersRepository.createQueryBuilder.mockReturnValue(mockPlayerQb as unknown as SelectQueryBuilder<Player>);
      playersRepository.findOne.mockResolvedValue(mockPlayer);

      const mockAttendanceQb = createMockQueryBuilder();
      mockAttendanceQb.getCount.mockResolvedValue(5);
      attendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as unknown as SelectQueryBuilder<Attendance>);

      const mockGoalsQb = createMockQueryBuilder();
      mockGoalsQb.getCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
      goalsRepository.createQueryBuilder.mockReturnValue(mockGoalsQb as unknown as SelectQueryBuilder<Goal>);

      const result = await service.getMyStats('user-123');

      expect(mockPlayerQb.innerJoin).toHaveBeenCalledWith('player.user', 'user');
      expect(mockPlayerQb.where).toHaveBeenCalledWith('user.id = :userId', { userId: 'user-123' });
      expect(result.playerId).toBe('player-123');
    });

    it('should throw NotFoundException when player profile not found', async () => {
      const mockPlayerQb = createMockQueryBuilder();
      mockPlayerQb.getOne.mockResolvedValue(null);
      playersRepository.createQueryBuilder.mockReturnValue(mockPlayerQb as unknown as SelectQueryBuilder<Player>);

      await expect(service.getMyStats('nonexistent-user'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getTeamStats', () => {
    it('should return team stats for coach groups', async () => {
      const mockGroup = { id: 'group-1', name: 'U12', players: [mockPlayer] } as unknown as Group;
      const mockCoach = {
        id: 'coach-123',
        headGroups: [{ id: 'group-1' }],
        assistantGroups: [{ id: 'group-2' }],
      } as unknown as Coach;

      coachesRepository.findOne.mockResolvedValue(mockCoach);

      const mockGroups = [
        {
          id: 'group-1',
          name: 'U12',
          players: [mockPlayer],
        },
        {
          id: 'group-2',
          name: 'U14',
          players: [],
        },
      ] as unknown as Group[];
      groupsRepository.find.mockResolvedValue(mockGroups);

      playersRepository.findOne.mockResolvedValue(mockPlayer);

      const mockAttendanceQb = createMockQueryBuilder();
      mockAttendanceQb.getCount.mockResolvedValue(5);
      attendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as unknown as SelectQueryBuilder<Attendance>);

      const mockGoalsQb = createMockQueryBuilder();
      mockGoalsQb.getCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
      goalsRepository.createQueryBuilder.mockReturnValue(mockGoalsQb as unknown as SelectQueryBuilder<Goal>);

      const result = await service.getTeamStats('user-123');

      expect(coachesRepository.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'user-123' } },
        relations: ['headGroups', 'assistantGroups'],
      });
      expect(result).toHaveLength(2);
      expect(result[0].groupName).toBe('U12');
    });

    it('should throw NotFoundException when coach profile not found', async () => {
      coachesRepository.findOne.mockResolvedValue(null);

      await expect(service.getTeamStats('nonexistent-user'))
        .rejects.toThrow(NotFoundException);
    });

    it('should return empty array when coach has no groups', async () => {
      const mockCoach = {
        id: 'coach-123',
        headGroups: [],
        assistantGroups: [],
      } as unknown as Coach;
      coachesRepository.findOne.mockResolvedValue(mockCoach);

      const result = await service.getTeamStats('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getChildrenStats', () => {
    it('should return stats for parent children', async () => {
      const mockParent = {
        id: 'parent-123',
        children: [mockPlayer],
      };

      const mockParentQb = createMockQueryBuilder();
      mockParentQb.getOne.mockResolvedValue(mockParent);
      parentsRepository.createQueryBuilder.mockReturnValue(mockParentQb as unknown as SelectQueryBuilder<Parent>);

      playersRepository.findOne.mockResolvedValue(mockPlayer);

      const mockAttendanceQb = createMockQueryBuilder();
      mockAttendanceQb.getCount.mockResolvedValue(5);
      attendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as unknown as SelectQueryBuilder<Attendance>);

      const mockGoalsQb = createMockQueryBuilder();
      mockGoalsQb.getCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
      goalsRepository.createQueryBuilder.mockReturnValue(mockGoalsQb as unknown as SelectQueryBuilder<Goal>);

      const result = await service.getChildrenStats('user-123');

      expect(result.children).toHaveLength(1);
      expect(result.stats).not.toBeNull();
    });

    it('should throw NotFoundException when parent profile not found', async () => {
      const mockParentQb = createMockQueryBuilder();
      mockParentQb.getOne.mockResolvedValue(null);
      parentsRepository.createQueryBuilder.mockReturnValue(mockParentQb as unknown as SelectQueryBuilder<Parent>);

      await expect(service.getChildrenStats('nonexistent-user'))
        .rejects.toThrow(NotFoundException);
    });

    it('should return empty stats when parent has no children', async () => {
      const mockParent = {
        id: 'parent-123',
        children: [],
      };

      const mockParentQb = createMockQueryBuilder();
      mockParentQb.getOne.mockResolvedValue(mockParent);
      parentsRepository.createQueryBuilder.mockReturnValue(mockParentQb as unknown as SelectQueryBuilder<Parent>);

      const result = await service.getChildrenStats('user-123');

      expect(result.children).toEqual([]);
      expect(result.stats).toBeNull();
    });

    it('should throw BadRequestException when child does not belong to parent', async () => {
      const mockParent = {
        id: 'parent-123',
        children: [mockPlayer],
      };

      const mockParentQb = createMockQueryBuilder();
      mockParentQb.getOne.mockResolvedValue(mockParent);
      parentsRepository.createQueryBuilder.mockReturnValue(mockParentQb as unknown as SelectQueryBuilder<Parent>);

      await expect(service.getChildrenStats('user-123', 'wrong-child-id'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    const createPlayerDto = {
      email: 'newplayer@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'Player',
      phoneNumber: '+380501234567',
      dateOfBirth: '2010-05-15',
      position: 'Midfielder',
      height: 160,
      weight: 50,
      strongFoot: 'left',
    };

    it('should create a new player with user', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockQueryRunner.manager.create.mockImplementation((_: any, data: any) => data);
      mockQueryRunner.manager.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.create(createPlayerDto);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createPlayerDto))
        .rejects.toThrow(ConflictException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove player and associated user', async () => {
      const playerWithUser = { ...mockPlayer, user: mockUser } as unknown as Player;
      playersRepository.findOne.mockResolvedValue(playerWithUser);

      await service.remove('player-123');

      expect(playersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'player-123' },
        relations: ['user'],
      });
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException when player not found', async () => {
      playersRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
