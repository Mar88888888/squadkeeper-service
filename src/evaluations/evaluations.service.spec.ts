import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { Evaluation } from './entities/evaluation.entity';
import { Player } from '../players/entities/player.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';
import { EvaluationType } from './enums/evaluation-type.enum';

describe('EvaluationsService', () => {
  let service: EvaluationsService;
  let evaluationsRepository: jest.Mocked<Repository<Evaluation>>;
  let trainingsRepository: jest.Mocked<Repository<Training>>;
  let matchesRepository: jest.Mocked<Repository<Match>>;
  let mockQueryRunner: any;

  const mockPlayer = {
    id: 'player-123',
    firstName: 'John',
    lastName: 'Doe',
  } as unknown as Player;

  const mockCoach = {
    id: 'coach-123',
    firstName: 'Coach',
    lastName: 'One',
  } as unknown as Coach;

  const mockTraining = {
    id: 'training-123',
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T12:00:00Z'),
  } as unknown as Training;

  const mockMatch = {
    id: 'match-123',
    startTime: new Date('2024-01-20T14:00:00Z'),
  } as unknown as Match;

  const mockEvaluation = {
    id: 'eval-123',
    player: mockPlayer,
    coach: mockCoach,
    training: mockTraining,
    match: null,
    type: EvaluationType.TECHNIQUE,
    rating: 4,
    comment: 'Good performance',
    createdAt: new Date(),
  } as unknown as Evaluation;

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
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const mockEvaluationsRepository = {
      find: jest.fn(),
    };

    const mockPlayersRepository = {
      findOne: jest.fn(),
    };

    const mockCoachesRepository = {
      findOne: jest.fn(),
    };

    const mockTrainingsRepository = {
      findOne: jest.fn(),
    };

    const mockMatchesRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationsService,
        { provide: getRepositoryToken(Evaluation), useValue: mockEvaluationsRepository },
        { provide: getRepositoryToken(Player), useValue: mockPlayersRepository },
        { provide: getRepositoryToken(Coach), useValue: mockCoachesRepository },
        { provide: getRepositoryToken(Training), useValue: mockTrainingsRepository },
        { provide: getRepositoryToken(Match), useValue: mockMatchesRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<EvaluationsService>(EvaluationsService);
    evaluationsRepository = module.get(getRepositoryToken(Evaluation));
    trainingsRepository = module.get(getRepositoryToken(Training));
    matchesRepository = module.get(getRepositoryToken(Match));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBatch', () => {
    const createBatchDto = {
      trainingId: 'training-123',
      records: [
        { playerId: 'player-123', type: EvaluationType.TECHNIQUE, rating: 4, comment: 'Good' },
        { playerId: 'player-456', type: EvaluationType.TACTICS, rating: 3 },
      ],
    };

    it('should create evaluations for training', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockTraining) // Find training
        .mockResolvedValueOnce(mockCoach) // Find coach
        .mockResolvedValueOnce(mockPlayer) // Find first player
        .mockResolvedValueOnce(null) // No existing evaluation
        .mockResolvedValueOnce({ ...mockPlayer, id: 'player-456' }) // Find second player
        .mockResolvedValueOnce(null); // No existing evaluation

      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.createBatch(createBatchDto, 'coach-user-id');

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should create evaluations for match', async () => {
      const matchDto = {
        matchId: 'match-123',
        records: [{ playerId: 'player-123', type: EvaluationType.TECHNIQUE, rating: 4 }],
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockMatch)
        .mockResolvedValueOnce(mockCoach)
        .mockResolvedValueOnce(mockPlayer)
        .mockResolvedValueOnce(null);

      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.createBatch(matchDto, 'coach-user-id');

      expect(result).toHaveLength(1);
    });

    it('should throw BadRequestException when neither trainingId nor matchId', async () => {
      const invalidDto = {
        records: [{ playerId: 'player-123', type: EvaluationType.TECHNIQUE, rating: 4 }],
      };

      await expect(service.createBatch(invalidDto as any, 'coach-user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when both trainingId and matchId', async () => {
      const invalidDto = {
        trainingId: 'training-123',
        matchId: 'match-123',
        records: [{ playerId: 'player-123', type: EvaluationType.TECHNIQUE, rating: 4 }],
      };

      await expect(service.createBatch(invalidDto, 'coach-user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when training not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.createBatch(createBatchDto, 'coach-user-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when match not found', async () => {
      const matchDto = {
        matchId: 'match-123',
        records: [{ playerId: 'player-123', type: EvaluationType.TECHNIQUE, rating: 4 }],
      };
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.createBatch(matchDto, 'coach-user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when coach not found', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockTraining)
        .mockResolvedValueOnce(null);

      await expect(service.createBatch(createBatchDto, 'coach-user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when player not found', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockTraining)
        .mockResolvedValueOnce(mockCoach)
        .mockResolvedValueOnce(null);

      await expect(service.createBatch(createBatchDto, 'coach-user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update existing evaluation', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockTraining)
        .mockResolvedValueOnce(mockCoach)
        .mockResolvedValueOnce(mockPlayer)
        .mockResolvedValueOnce(mockEvaluation) // Existing evaluation
        .mockResolvedValueOnce({ ...mockPlayer, id: 'player-456' })
        .mockResolvedValueOnce(null);

      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.createBatch(createBatchDto, 'coach-user-id');

      expect(result).toHaveLength(2);
    });

    it('should rollback on error', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockTraining)
        .mockResolvedValueOnce(mockCoach)
        .mockResolvedValueOnce(mockPlayer)
        .mockResolvedValueOnce(null);

      mockQueryRunner.manager.create.mockImplementation(() => {
        throw new Error('DB error');
      });

      await expect(service.createBatch(createBatchDto, 'coach-user-id')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('findByTraining', () => {
    it('should return evaluations for a training', async () => {
      trainingsRepository.findOne.mockResolvedValue(mockTraining);
      evaluationsRepository.find.mockResolvedValue([mockEvaluation]);

      const result = await service.findByTraining('training-123');

      expect(trainingsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'training-123' },
      });
      expect(evaluationsRepository.find).toHaveBeenCalledWith({
        where: { training: { id: 'training-123' } },
        relations: ['player', 'coach', 'training'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockEvaluation]);
    });

    it('should throw NotFoundException when training not found', async () => {
      trainingsRepository.findOne.mockResolvedValue(null);

      await expect(service.findByTraining('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByMatch', () => {
    it('should return evaluations for a match', async () => {
      const matchEvaluation = { ...mockEvaluation, training: null, match: mockMatch };
      matchesRepository.findOne.mockResolvedValue(mockMatch);
      evaluationsRepository.find.mockResolvedValue([matchEvaluation as unknown as Evaluation]);

      const result = await service.findByMatch('match-123');

      expect(matchesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'match-123' },
      });
      expect(evaluationsRepository.find).toHaveBeenCalledWith({
        where: { match: { id: 'match-123' } },
        relations: ['player', 'coach', 'match'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException when match not found', async () => {
      matchesRepository.findOne.mockResolvedValue(null);

      await expect(service.findByMatch('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPlayer', () => {
    it('should return evaluations for a player', async () => {
      evaluationsRepository.find.mockResolvedValue([mockEvaluation]);

      const result = await service.findByPlayer('player-123');

      expect(evaluationsRepository.find).toHaveBeenCalledWith({
        where: { player: { id: 'player-123' } },
        relations: ['player', 'coach', 'training', 'match'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockEvaluation]);
    });
  });
});
