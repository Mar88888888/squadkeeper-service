import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { Match } from './entities/match.entity';
import { Goal } from './entities/goal.entity';
import { Group } from '../groups/entities/group.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { MatchType } from './enums/match-type.enum';
import { MatchTimeFilter } from './dto/filter-matches.dto';
import { UserRole } from '../users/enums/user-role.enum';

describe('MatchesService', () => {
  let service: MatchesService;
  let matchesRepository: jest.Mocked<Repository<Match>>;
  let goalsRepository: jest.Mocked<Repository<Goal>>;
  let groupsRepository: jest.Mocked<Repository<Group>>;
  let coachesRepository: jest.Mocked<Repository<Coach>>;
  let playersRepository: jest.Mocked<Repository<Player>>;
  let parentsRepository: jest.Mocked<Repository<Parent>>;

  const mockGroup = {
    id: 'group-123',
    name: 'U12',
    players: [],
  } as unknown as Group;

  const mockMatch = {
    id: 'match-123',
    opponent: 'Team B',
    location: 'Stadium A',
    startTime: new Date('2024-01-20T14:00:00Z'),
    endTime: new Date('2024-01-20T16:00:00Z'),
    isHome: true,
    matchType: MatchType.FRIENDLY,
    homeGoals: null,
    awayGoals: null,
    group: mockGroup,
    goals: [],
  } as unknown as Match;

  const mockPlayer = {
    id: 'player-123',
    firstName: 'John',
    lastName: 'Doe',
    group: mockGroup,
  } as unknown as Player;

  const mockCoach = {
    id: 'coach-123',
    headGroups: [mockGroup],
    assistantGroups: [],
  } as unknown as Coach;

  beforeEach(async () => {
    const mockMatchesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const mockGoalsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const mockGroupsRepository = {
      findOne: jest.fn(),
    };

    const mockCoachesRepository = {
      findOne: jest.fn(),
    };

    const mockPlayersRepository = {
      findOne: jest.fn(),
    };

    const mockParentsRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: getRepositoryToken(Match), useValue: mockMatchesRepository },
        { provide: getRepositoryToken(Goal), useValue: mockGoalsRepository },
        { provide: getRepositoryToken(Group), useValue: mockGroupsRepository },
        { provide: getRepositoryToken(Coach), useValue: mockCoachesRepository },
        { provide: getRepositoryToken(Player), useValue: mockPlayersRepository },
        { provide: getRepositoryToken(Parent), useValue: mockParentsRepository },
      ],
    }).compile();

    service = module.get<MatchesService>(MatchesService);
    matchesRepository = module.get(getRepositoryToken(Match));
    goalsRepository = module.get(getRepositoryToken(Goal));
    groupsRepository = module.get(getRepositoryToken(Group));
    coachesRepository = module.get(getRepositoryToken(Coach));
    playersRepository = module.get(getRepositoryToken(Player));
    parentsRepository = module.get(getRepositoryToken(Parent));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createMatchDto = {
      groupId: 'group-123',
      opponent: 'Team B',
      location: 'Stadium A',
      startTime: new Date('2024-01-20T14:00:00Z'),
      endTime: new Date('2024-01-20T16:00:00Z'),
      isHome: true,
    };

    it('should create a match', async () => {
      groupsRepository.findOne.mockResolvedValue(mockGroup);
      matchesRepository.create.mockReturnValue(mockMatch);
      matchesRepository.save.mockResolvedValue(mockMatch);

      const result = await service.create(createMatchDto);

      expect(groupsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'group-123' },
      });
      expect(result).toEqual(mockMatch);
    });

    it('should throw NotFoundException when group not found', async () => {
      groupsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createMatchDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when endTime before startTime', async () => {
      groupsRepository.findOne.mockResolvedValue(mockGroup);

      const invalidDto = {
        ...createMatchDto,
        startTime: new Date('2024-01-20T16:00:00Z'),
        endTime: new Date('2024-01-20T14:00:00Z'),
      };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all matches without filters', async () => {
      matchesRepository.find.mockResolvedValue([mockMatch]);

      const result = await service.findAll();

      expect(matchesRepository.find).toHaveBeenCalled();
      expect(result).toEqual([mockMatch]);
    });

    it('should filter by UPCOMING time filter', async () => {
      matchesRepository.find.mockResolvedValue([mockMatch]);

      await service.findAll({ timeFilter: MatchTimeFilter.UPCOMING });

      expect(matchesRepository.find).toHaveBeenCalled();
    });

    it('should filter by PAST time filter', async () => {
      matchesRepository.find.mockResolvedValue([mockMatch]);

      await service.findAll({ timeFilter: MatchTimeFilter.PAST });

      expect(matchesRepository.find).toHaveBeenCalled();
    });

    it('should filter by THIS_WEEK time filter', async () => {
      matchesRepository.find.mockResolvedValue([mockMatch]);

      await service.findAll({ timeFilter: MatchTimeFilter.THIS_WEEK });

      expect(matchesRepository.find).toHaveBeenCalled();
    });

    it('should filter by NEXT_WEEK time filter', async () => {
      matchesRepository.find.mockResolvedValue([mockMatch]);

      await service.findAll({ timeFilter: MatchTimeFilter.NEXT_WEEK });

      expect(matchesRepository.find).toHaveBeenCalled();
    });

    it('should filter by THIS_MONTH time filter', async () => {
      matchesRepository.find.mockResolvedValue([mockMatch]);

      await service.findAll({ timeFilter: MatchTimeFilter.THIS_MONTH });

      expect(matchesRepository.find).toHaveBeenCalled();
    });

    it('should filter by custom date range', async () => {
      matchesRepository.find.mockResolvedValue([mockMatch]);

      await service.findAll({ dateFrom: '2024-01-01', dateTo: '2024-01-31' });

      expect(matchesRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a match by id', async () => {
      matchesRepository.findOne.mockResolvedValue(mockMatch);

      const result = await service.findOne('match-123');

      expect(matchesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'match-123' },
        relations: ['group', 'group.players', 'goals', 'goals.scorer', 'goals.assist'],
      });
      expect(result).toEqual(mockMatch);
    });

    it('should throw NotFoundException when match not found', async () => {
      matchesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByGroup', () => {
    it('should return matches for a group', async () => {
      groupsRepository.findOne.mockResolvedValue(mockGroup);
      matchesRepository.find.mockResolvedValue([mockMatch]);

      const result = await service.findByGroup('group-123');

      expect(result).toEqual([mockMatch]);
    });

    it('should throw NotFoundException when group not found', async () => {
      groupsRepository.findOne.mockResolvedValue(null);

      await expect(service.findByGroup('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMyMatches', () => {
    it('should return all matches for admin', async () => {
      matchesRepository.find.mockResolvedValue([mockMatch]);

      const result = await service.findMyMatches('admin-id', UserRole.ADMIN);

      expect(result).toEqual([mockMatch]);
    });

    it('should return matches for coach groups', async () => {
      coachesRepository.findOne.mockResolvedValue(mockCoach);
      matchesRepository.find.mockResolvedValue([mockMatch]);

      const result = await service.findMyMatches('coach-id', UserRole.COACH);

      expect(coachesRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual([mockMatch]);
    });

    it('should return matches for player group', async () => {
      playersRepository.findOne.mockResolvedValue(mockPlayer);
      matchesRepository.find.mockResolvedValue([mockMatch]);

      const result = await service.findMyMatches('player-id', UserRole.PLAYER);

      expect(playersRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual([mockMatch]);
    });

    it('should return matches for parent children groups', async () => {
      const parent = { children: [mockPlayer] } as unknown as Parent;
      parentsRepository.findOne.mockResolvedValue(parent);
      matchesRepository.find.mockResolvedValue([mockMatch]);

      const result = await service.findMyMatches('parent-id', UserRole.PARENT);

      expect(parentsRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual([mockMatch]);
    });

    it('should return empty array when player has no group', async () => {
      playersRepository.findOne.mockResolvedValue({ ...mockPlayer, group: null } as unknown as Player);

      const result = await service.findMyMatches('player-id', UserRole.PLAYER);

      expect(result).toEqual([]);
    });
  });

  describe('updateResult', () => {
    it('should update match result', async () => {
      matchesRepository.findOne.mockResolvedValue({ ...mockMatch, goals: [] });
      matchesRepository.save.mockImplementation((m) => Promise.resolve(m as Match));

      const result = await service.updateResult('match-123', { homeGoals: 2, awayGoals: 1 });

      expect(result.homeGoals).toBe(2);
      expect(result.awayGoals).toBe(1);
    });

    it('should throw NotFoundException when match not found', async () => {
      matchesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateResult('nonexistent', { homeGoals: 2, awayGoals: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new score below recorded goals', async () => {
      const matchWithGoals = {
        ...mockMatch,
        isHome: true,
        goals: [{ isOwnGoal: false }, { isOwnGoal: false }],
      };
      matchesRepository.findOne.mockResolvedValue(matchWithGoals as unknown as Match);

      await expect(
        service.updateResult('match-123', { homeGoals: 1, awayGoals: 0 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addGoal', () => {
    it('should add a goal to match', async () => {
      const matchWithScore = {
        ...mockMatch,
        homeGoals: 2,
        awayGoals: 1,
        goals: [],
      };
      matchesRepository.findOne.mockResolvedValue(matchWithScore as unknown as Match);
      playersRepository.findOne.mockResolvedValue(mockPlayer);
      goalsRepository.create.mockReturnValue({ id: 'goal-123' } as unknown as Goal);
      goalsRepository.save.mockResolvedValue({ id: 'goal-123' } as unknown as Goal);

      const result = await service.addGoal('match-123', {
        scorerId: 'player-123',
        minute: 45,
      });

      expect(result.id).toBe('goal-123');
    });

    it('should throw NotFoundException when match not found', async () => {
      matchesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addGoal('nonexistent', { scorerId: 'player-123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when match score not set', async () => {
      matchesRepository.findOne.mockResolvedValue(mockMatch);

      await expect(
        service.addGoal('match-123', { scorerId: 'player-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when scorer not found', async () => {
      const matchWithScore = { ...mockMatch, homeGoals: 2, awayGoals: 1, goals: [] };
      matchesRepository.findOne.mockResolvedValue(matchWithScore as unknown as Match);
      playersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addGoal('match-123', { scorerId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when goal limit reached', async () => {
      const matchWithMaxGoals = {
        ...mockMatch,
        isHome: true,
        homeGoals: 1,
        awayGoals: 0,
        goals: [{ isOwnGoal: false }],
      };
      matchesRepository.findOne.mockResolvedValue(matchWithMaxGoals as unknown as Match);
      playersRepository.findOne.mockResolvedValue(mockPlayer);

      await expect(
        service.addGoal('match-123', { scorerId: 'player-123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeGoal', () => {
    it('should remove a goal', async () => {
      const goal = { id: 'goal-123' } as unknown as Goal;
      goalsRepository.findOne.mockResolvedValue(goal);
      goalsRepository.remove.mockResolvedValue(goal);

      await service.removeGoal('match-123', 'goal-123');

      expect(goalsRepository.remove).toHaveBeenCalledWith(goal);
    });

    it('should throw NotFoundException when goal not found', async () => {
      goalsRepository.findOne.mockResolvedValue(null);

      await expect(service.removeGoal('match-123', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getGoals', () => {
    it('should return goals for a match', async () => {
      const goals = [{ id: 'goal-123' }] as unknown as Goal[];
      goalsRepository.find.mockResolvedValue(goals);

      const result = await service.getGoals('match-123');

      expect(goalsRepository.find).toHaveBeenCalledWith({
        where: { match: { id: 'match-123' } },
        relations: ['scorer', 'assist'],
        order: { minute: 'ASC' },
      });
      expect(result).toEqual(goals);
    });
  });

  describe('remove', () => {
    it('should remove a match', async () => {
      matchesRepository.findOne.mockResolvedValue(mockMatch);
      matchesRepository.remove.mockResolvedValue(mockMatch);

      await service.remove('match-123');

      expect(matchesRepository.remove).toHaveBeenCalledWith(mockMatch);
    });

    it('should throw NotFoundException when match not found', async () => {
      matchesRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
