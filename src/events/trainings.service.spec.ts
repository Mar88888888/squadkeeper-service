import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TrainingsService } from './trainings.service';
import { Training } from './entities/training.entity';
import { Group } from '../groups/entities/group.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { TrainingTimeFilter } from './dto/filter-trainings.dto';
import { UserRole } from '../users/enums/user-role.enum';

describe('TrainingsService', () => {
  let service: TrainingsService;
  let trainingsRepository: jest.Mocked<Repository<Training>>;
  let groupsRepository: jest.Mocked<Repository<Group>>;
  let coachesRepository: jest.Mocked<Repository<Coach>>;
  let playersRepository: jest.Mocked<Repository<Player>>;
  let parentsRepository: jest.Mocked<Repository<Parent>>;

  const mockGroup = {
    id: 'group-123',
    name: 'U12',
    yearOfBirth: 2012,
    players: [],
  } as unknown as Group;

  const mockTraining = {
    id: 'training-123',
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T12:00:00Z'),
    location: 'Stadium A',
    notes: 'Regular training',
    group: mockGroup,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Training;

  const mockPlayer = {
    id: 'player-123',
    firstName: 'John',
    lastName: 'Doe',
    group: mockGroup,
  } as unknown as Player;

  const mockCoach = {
    id: 'coach-123',
    firstName: 'Coach',
    lastName: 'One',
    headGroups: [mockGroup],
    assistantGroups: [],
  } as unknown as Coach;

  beforeEach(async () => {
    const mockTrainingsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
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
        TrainingsService,
        { provide: getRepositoryToken(Training), useValue: mockTrainingsRepository },
        { provide: getRepositoryToken(Group), useValue: mockGroupsRepository },
        { provide: getRepositoryToken(Coach), useValue: mockCoachesRepository },
        { provide: getRepositoryToken(Player), useValue: mockPlayersRepository },
        { provide: getRepositoryToken(Parent), useValue: mockParentsRepository },
      ],
    }).compile();

    service = module.get<TrainingsService>(TrainingsService);
    trainingsRepository = module.get(getRepositoryToken(Training));
    groupsRepository = module.get(getRepositoryToken(Group));
    coachesRepository = module.get(getRepositoryToken(Coach));
    playersRepository = module.get(getRepositoryToken(Player));
    parentsRepository = module.get(getRepositoryToken(Parent));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createTrainingDto = {
      groupId: 'group-123',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T12:00:00Z'),
      location: 'Stadium A',
      notes: 'Regular training',
    };

    it('should create a training', async () => {
      groupsRepository.findOne.mockResolvedValue(mockGroup);
      trainingsRepository.create.mockReturnValue(mockTraining);
      trainingsRepository.save.mockResolvedValue(mockTraining);

      const result = await service.create(createTrainingDto);

      expect(groupsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'group-123' },
      });
      expect(trainingsRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockTraining);
    });

    it('should throw NotFoundException when group not found', async () => {
      groupsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createTrainingDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when endTime is before startTime', async () => {
      groupsRepository.findOne.mockResolvedValue(mockGroup);

      const invalidDto = {
        ...createTrainingDto,
        startTime: new Date('2024-01-15T14:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'),
      };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all trainings without filters', async () => {
      const trainings = [mockTraining];
      trainingsRepository.find.mockResolvedValue(trainings);

      const result = await service.findAll();

      expect(trainingsRepository.find).toHaveBeenCalledWith({
        where: undefined,
        relations: ['group'],
        order: { startTime: 'ASC' },
      });
      expect(result).toEqual(trainings);
    });

    it('should filter by UPCOMING time filter', async () => {
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      await service.findAll({ timeFilter: TrainingTimeFilter.UPCOMING });

      expect(trainingsRepository.find).toHaveBeenCalled();
      const callArgs = trainingsRepository.find.mock.calls[0]?.[0];
      expect(callArgs?.where).toBeDefined();
    });

    it('should filter by PAST time filter', async () => {
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      await service.findAll({ timeFilter: TrainingTimeFilter.PAST });

      expect(trainingsRepository.find).toHaveBeenCalled();
    });

    it('should filter by THIS_WEEK time filter', async () => {
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      await service.findAll({ timeFilter: TrainingTimeFilter.THIS_WEEK });

      expect(trainingsRepository.find).toHaveBeenCalled();
    });

    it('should filter by NEXT_WEEK time filter', async () => {
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      await service.findAll({ timeFilter: TrainingTimeFilter.NEXT_WEEK });

      expect(trainingsRepository.find).toHaveBeenCalled();
    });

    it('should filter by THIS_MONTH time filter', async () => {
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      await service.findAll({ timeFilter: TrainingTimeFilter.THIS_MONTH });

      expect(trainingsRepository.find).toHaveBeenCalled();
    });

    it('should filter by custom date range', async () => {
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      await service.findAll({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      });

      expect(trainingsRepository.find).toHaveBeenCalled();
    });

    it('should filter by dateFrom only', async () => {
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      await service.findAll({ dateFrom: '2024-01-01' });

      expect(trainingsRepository.find).toHaveBeenCalled();
    });

    it('should filter by dateTo only', async () => {
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      await service.findAll({ dateTo: '2024-01-31' });

      expect(trainingsRepository.find).toHaveBeenCalled();
    });
  });

  describe('findByGroup', () => {
    it('should return trainings for a group', async () => {
      groupsRepository.findOne.mockResolvedValue(mockGroup);
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      const result = await service.findByGroup('group-123');

      expect(groupsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'group-123' },
      });
      expect(result).toEqual([mockTraining]);
    });

    it('should throw NotFoundException when group not found', async () => {
      groupsRepository.findOne.mockResolvedValue(null);

      await expect(service.findByGroup('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a training by id', async () => {
      const trainingWithPlayers = { ...mockTraining, group: { ...mockGroup, players: [mockPlayer] } } as unknown as Training;
      trainingsRepository.findOne.mockResolvedValue(trainingWithPlayers);

      const result = await service.findOne('training-123');

      expect(trainingsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'training-123' },
        relations: ['group', 'group.players'],
      });
      expect(result).toEqual(trainingWithPlayers);
    });

    it('should throw NotFoundException when training not found', async () => {
      trainingsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneForUser', () => {
    beforeEach(() => {
      const trainingWithPlayers = { ...mockTraining, group: { ...mockGroup, players: [mockPlayer] } } as unknown as Training;
      trainingsRepository.findOne.mockResolvedValue(trainingWithPlayers);
    });

    it('should return training for admin without restrictions', async () => {
      const result = await service.findOneForUser('training-123', 'admin-id', UserRole.ADMIN);

      expect(result).toBeDefined();
    });

    it('should return training for coach assigned to group', async () => {
      coachesRepository.findOne.mockResolvedValue(mockCoach);

      const result = await service.findOneForUser('training-123', 'coach-id', UserRole.COACH);

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for coach not assigned to group', async () => {
      const coachNotInGroup = {
        ...mockCoach,
        headGroups: [],
        assistantGroups: [],
      } as unknown as Coach;
      coachesRepository.findOne.mockResolvedValue(coachNotInGroup);

      await expect(
        service.findOneForUser('training-123', 'coach-id', UserRole.COACH),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return training for player in group', async () => {
      playersRepository.findOne.mockResolvedValue(mockPlayer);

      const result = await service.findOneForUser('training-123', 'player-id', UserRole.PLAYER);

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for player not in group', async () => {
      const playerNotInGroup = {
        ...mockPlayer,
        group: { id: 'different-group' },
      } as unknown as Player;
      playersRepository.findOne.mockResolvedValue(playerNotInGroup);

      await expect(
        service.findOneForUser('training-123', 'player-id', UserRole.PLAYER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return training for parent with child in group', async () => {
      const parent = {
        id: 'parent-123',
        children: [mockPlayer],
      } as unknown as Parent;
      parentsRepository.findOne.mockResolvedValue(parent);

      const result = await service.findOneForUser('training-123', 'parent-id', UserRole.PARENT);

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for parent with no children in group', async () => {
      const parent = {
        id: 'parent-123',
        children: [{ ...mockPlayer, group: { id: 'different-group' } }],
      } as unknown as Parent;
      parentsRepository.findOne.mockResolvedValue(parent);

      await expect(
        service.findOneForUser('training-123', 'parent-id', UserRole.PARENT),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findMyTrainings', () => {
    it('should return all trainings for admin', async () => {
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      const result = await service.findMyTrainings('admin-id', UserRole.ADMIN);

      expect(result).toEqual([mockTraining]);
    });

    it('should return coach group trainings', async () => {
      coachesRepository.findOne.mockResolvedValue(mockCoach);
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      const result = await service.findMyTrainings('coach-id', UserRole.COACH);

      expect(coachesRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual([mockTraining]);
    });

    it('should return player group trainings', async () => {
      playersRepository.findOne.mockResolvedValue(mockPlayer);
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      const result = await service.findMyTrainings('player-id', UserRole.PLAYER);

      expect(playersRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual([mockTraining]);
    });

    it('should return empty array when player has no group', async () => {
      const playerWithoutGroup = { ...mockPlayer, group: null } as unknown as Player;
      playersRepository.findOne.mockResolvedValue(playerWithoutGroup);

      const result = await service.findMyTrainings('player-id', UserRole.PLAYER);

      expect(result).toEqual([]);
    });

    it('should return parent children group trainings', async () => {
      const parent = {
        id: 'parent-123',
        children: [mockPlayer],
      } as unknown as Parent;
      parentsRepository.findOne.mockResolvedValue(parent);
      trainingsRepository.find.mockResolvedValue([mockTraining]);

      const result = await service.findMyTrainings('parent-id', UserRole.PARENT);

      expect(parentsRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual([mockTraining]);
    });

    it('should return empty array when coach has no groups', async () => {
      const coachWithoutGroups = {
        ...mockCoach,
        headGroups: [],
        assistantGroups: [],
      } as unknown as Coach;
      coachesRepository.findOne.mockResolvedValue(coachWithoutGroups);

      const result = await service.findMyTrainings('coach-id', UserRole.COACH);

      expect(result).toEqual([]);
    });
  });
});
