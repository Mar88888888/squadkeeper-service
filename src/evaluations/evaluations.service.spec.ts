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
import { Attendance } from '../attendance/entities/attendance.entity';
import { AttendanceStatus } from '../attendance/enums/attendance-status.enum';

describe('EvaluationsService', () => {
  let service: EvaluationsService;
  let evaluationsRepository: jest.Mocked<Repository<Evaluation>>;
  let trainingsRepository: jest.Mocked<Repository<Training>>;
  let matchesRepository: jest.Mocked<Repository<Match>>;
  let mockManager: any;
  let mockDataSource: any;

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

  const mockAttendance = {
    id: 'attendance-123',
    status: AttendanceStatus.PRESENT,
  } as unknown as Attendance;

  const mockEvaluation = {
    id: 'eval-123',
    player: mockPlayer,
    coach: mockCoach,
    training: mockTraining,
    match: null,
    technical: 7,
    tactical: 6,
    physical: 8,
    psychological: 7,
    comment: 'Good performance',
    createdAt: new Date(),
  } as unknown as Evaluation;

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockManager)),
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
        { playerId: 'player-123', technical: 7, tactical: 6, physical: 8, psychological: 7, comment: 'Good' },
        { playerId: 'player-456', technical: 6, tactical: 5, physical: 7, psychological: 6 },
      ],
    };

    it('should create evaluations for training', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockTraining)        // Find training
        .mockResolvedValueOnce(mockCoach)           // Find coach
        .mockResolvedValueOnce(mockPlayer)          // Find player 1
        .mockResolvedValueOnce(mockAttendance)      // Find attendance for player 1
        .mockResolvedValueOnce(null)                // No existing evaluation for player 1
        .mockResolvedValueOnce({ ...mockPlayer, id: 'player-456' })  // Find player 2
        .mockResolvedValueOnce(mockAttendance)      // Find attendance for player 2
        .mockResolvedValueOnce(null);               // No existing evaluation for player 2

      mockManager.create.mockImplementation((_, data) => data);
      mockManager.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.createBatch(createBatchDto, 'coach-user-id');

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should create evaluations for match', async () => {
      const matchDto = {
        matchId: 'match-123',
        records: [{ playerId: 'player-123', technical: 7, tactical: 6, physical: 8, psychological: 7 }],
      };

      mockManager.findOne
        .mockResolvedValueOnce(mockMatch)           // Find match
        .mockResolvedValueOnce(mockCoach)           // Find coach
        .mockResolvedValueOnce(mockPlayer)          // Find player
        .mockResolvedValueOnce(mockAttendance)      // Find attendance
        .mockResolvedValueOnce(null);               // No existing evaluation

      mockManager.create.mockImplementation((_, data) => data);
      mockManager.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.createBatch(matchDto, 'coach-user-id');

      expect(result).toHaveLength(1);
    });

    it('should throw BadRequestException when neither trainingId nor matchId', async () => {
      const invalidDto = {
        records: [{ playerId: 'player-123', technical: 7, tactical: 6, physical: 8, psychological: 7 }],
      };

      await expect(service.createBatch(invalidDto as any, 'coach-user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when both trainingId and matchId', async () => {
      const invalidDto = {
        trainingId: 'training-123',
        matchId: 'match-123',
        records: [{ playerId: 'player-123', technical: 7, tactical: 6, physical: 8, psychological: 7 }],
      };

      await expect(service.createBatch(invalidDto, 'coach-user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when training not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(service.createBatch(createBatchDto, 'coach-user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when match not found', async () => {
      const matchDto = {
        matchId: 'match-123',
        records: [{ playerId: 'player-123', technical: 7, tactical: 6, physical: 8, psychological: 7 }],
      };
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(service.createBatch(matchDto, 'coach-user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when coach not found', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockTraining)
        .mockResolvedValueOnce(null);

      await expect(service.createBatch(createBatchDto, 'coach-user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when player not found', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockTraining)
        .mockResolvedValueOnce(mockCoach)
        .mockResolvedValueOnce(null);

      await expect(service.createBatch(createBatchDto, 'coach-user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update existing evaluation', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockTraining)        // Find training
        .mockResolvedValueOnce(mockCoach)           // Find coach
        .mockResolvedValueOnce(mockPlayer)          // Find player 1
        .mockResolvedValueOnce(mockAttendance)      // Find attendance for player 1
        .mockResolvedValueOnce(mockEvaluation)      // Existing evaluation for player 1
        .mockResolvedValueOnce({ ...mockPlayer, id: 'player-456' })  // Find player 2
        .mockResolvedValueOnce(mockAttendance)      // Find attendance for player 2
        .mockResolvedValueOnce(null);               // No existing evaluation for player 2

      mockManager.create.mockImplementation((_, data) => data);
      mockManager.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.createBatch(createBatchDto, 'coach-user-id');

      expect(result).toHaveLength(2);
    });

    it('should rollback on error', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockTraining)        // Find training
        .mockResolvedValueOnce(mockCoach)           // Find coach
        .mockResolvedValueOnce(mockPlayer)          // Find player
        .mockResolvedValueOnce(mockAttendance)      // Find attendance
        .mockResolvedValueOnce(null);               // No existing evaluation

      mockManager.create.mockImplementation(() => {
        throw new Error('DB error');
      });

      await expect(service.createBatch(createBatchDto, 'coach-user-id')).rejects.toThrow(
        BadRequestException,
      );
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
