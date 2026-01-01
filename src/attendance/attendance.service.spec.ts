import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { Attendance } from './entities/attendance.entity';
import { Player } from '../players/entities/player.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';
import { AttendanceStatus } from './enums/attendance-status.enum';
import { EventType } from './dto/mark-attendance-batch.dto';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepository: jest.Mocked<Repository<Attendance>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockPlayer = {
    id: 'player-123',
    firstName: 'John',
    lastName: 'Doe',
  } as unknown as Player;

  const mockTraining = {
    id: 'training-123',
    startTime: new Date(),
    endTime: new Date(),
  } as unknown as Training;

  const mockMatch = {
    id: 'match-123',
    startTime: new Date(),
  } as unknown as Match;

  const mockAttendance = {
    id: 'attendance-123',
    player: mockPlayer,
    training: mockTraining,
    match: null,
    status: AttendanceStatus.PRESENT,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Attendance;

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
        delete: jest.fn(),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const mockAttendanceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockPlayersRepository = {
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
        AttendanceService,
        {
          provide: getRepositoryToken(Attendance),
          useValue: mockAttendanceRepository,
        },
        {
          provide: getRepositoryToken(Player),
          useValue: mockPlayersRepository,
        },
        {
          provide: getRepositoryToken(Training),
          useValue: mockTrainingsRepository,
        },
        { provide: getRepositoryToken(Match), useValue: mockMatchesRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    attendanceRepository = module.get(getRepositoryToken(Attendance));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markBatch', () => {
    const markBatchDto = {
      eventId: 'training-123',
      eventType: EventType.TRAINING,
      records: [
        { playerId: 'player-123', status: AttendanceStatus.PRESENT },
        {
          playerId: 'player-456',
          status: AttendanceStatus.ABSENT,
          notes: 'Sick',
        },
      ],
    };

    it('should mark attendance for training', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockTraining) // Find training
        .mockResolvedValueOnce(mockPlayer) // Find first player
        .mockResolvedValueOnce(null) // No existing attendance
        .mockResolvedValueOnce(mockTraining) // Get training for new attendance
        .mockResolvedValueOnce({ ...mockPlayer, id: 'player-456' }) // Find second player
        .mockResolvedValueOnce(null) // No existing attendance
        .mockResolvedValueOnce(mockTraining); // Get training for new attendance

      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.markBatch(markBatchDto);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should mark attendance for match', async () => {
      const matchDto = {
        eventId: 'match-123',
        eventType: EventType.MATCH,
        records: [{ playerId: 'player-123', status: AttendanceStatus.PRESENT }],
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockMatch) // Find match
        .mockResolvedValueOnce(mockPlayer) // Find player
        .mockResolvedValueOnce(null) // No existing attendance
        .mockResolvedValueOnce(mockMatch); // Get match for new attendance

      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.markBatch(matchDto);

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException when training not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.markBatch(markBatchDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when match not found', async () => {
      const matchDto = {
        eventId: 'match-123',
        eventType: EventType.MATCH,
        records: [{ playerId: 'player-123', status: AttendanceStatus.PRESENT }],
      };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.markBatch(matchDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when player not found', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockTraining)
        .mockResolvedValueOnce(null); // Player not found

      await expect(service.markBatch(markBatchDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update existing attendance', async () => {
      const existingAttendance = { ...mockAttendance };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockTraining)
        .mockResolvedValueOnce(mockPlayer)
        .mockResolvedValueOnce(existingAttendance)
        .mockResolvedValueOnce({ ...mockPlayer, id: 'player-456' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTraining);

      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.markBatch(markBatchDto);

      expect(result).toHaveLength(2);
    });

    it('should delete evaluations when status changed to not present', async () => {
      const existingAttendance = {
        ...mockAttendance,
        status: AttendanceStatus.PRESENT,
      };
      const dto = {
        eventId: 'training-123',
        eventType: EventType.TRAINING,
        records: [{ playerId: 'player-123', status: AttendanceStatus.ABSENT }],
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockTraining)
        .mockResolvedValueOnce(mockPlayer)
        .mockResolvedValueOnce(existingAttendance);

      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockQueryRunner.manager.delete.mockResolvedValue({ affected: 1 });

      await service.markBatch(dto);

      expect(mockQueryRunner.manager.delete).toHaveBeenCalled();
    });
  });

  describe('findByEvent', () => {
    it('should find attendance records for training', async () => {
      const attendances = [mockAttendance];
      attendanceRepository.find.mockResolvedValue(attendances);

      const result = await service.findByEvent(
        'training-123',
        EventType.TRAINING,
      );

      expect(attendanceRepository.find).toHaveBeenCalledWith({
        where: { training: { id: 'training-123' } },
        relations: ['player', 'training', 'match'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(attendances);
    });

    it('should find attendance records for match', async () => {
      const matchAttendance = {
        ...mockAttendance,
        training: null,
        match: mockMatch,
      } as unknown as Attendance;
      attendanceRepository.find.mockResolvedValue([matchAttendance]);

      const result = await service.findByEvent('match-123', EventType.MATCH);

      expect(attendanceRepository.find).toHaveBeenCalledWith({
        where: { match: { id: 'match-123' } },
        relations: ['player', 'training', 'match'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByEventForPlayers', () => {
    it('should filter attendance by player ids', async () => {
      const attendances = [
        { ...mockAttendance, player: { id: 'player-123' } },
        {
          ...mockAttendance,
          id: 'attendance-456',
          player: { id: 'player-456' },
        },
      ];
      attendanceRepository.find.mockResolvedValue(attendances as Attendance[]);

      const result = await service.findByEventForPlayers(
        'training-123',
        EventType.TRAINING,
        ['player-123'],
      );

      expect(result).toHaveLength(1);
      expect(result[0].player.id).toBe('player-123');
    });
  });

  describe('getPlayerStats', () => {
    it('should calculate player stats correctly', async () => {
      const attendances = [
        {
          ...mockAttendance,
          status: AttendanceStatus.PRESENT,
          training: mockTraining,
          match: null,
        },
        {
          ...mockAttendance,
          status: AttendanceStatus.LATE,
          training: mockTraining,
          match: null,
        },
        {
          ...mockAttendance,
          status: AttendanceStatus.ABSENT,
          training: null,
          match: mockMatch,
        },
        {
          ...mockAttendance,
          status: AttendanceStatus.SICK,
          training: mockTraining,
          match: null,
        },
        {
          ...mockAttendance,
          status: AttendanceStatus.EXCUSED,
          training: mockTraining,
          match: null,
        },
      ];
      attendanceRepository.find.mockResolvedValue(attendances as Attendance[]);

      const result = await service.getPlayerStats(['player-123']);

      expect(result.total).toBe(5);
      expect(result.present).toBe(1);
      expect(result.late).toBe(1);
      expect(result.absent).toBe(1);
      expect(result.sick).toBe(1);
      expect(result.excused).toBe(1);
      expect(result.totalTrainings).toBe(4);
      expect(result.totalMatches).toBe(1);
      expect(result.rate).toBe(40); // (1 + 1) / 5 * 100 = 40%
    });

    it('should return zero rate when no attendances', async () => {
      attendanceRepository.find.mockResolvedValue([]);

      const result = await service.getPlayerStats(['player-123']);

      expect(result.total).toBe(0);
      expect(result.rate).toBe(0);
    });
  });

  describe('getStatsPerPlayer', () => {
    it('should return stats for each player', async () => {
      const players = [
        { id: 'player-1', firstName: 'John', lastName: 'Doe' },
        { id: 'player-2', firstName: 'Jane', lastName: 'Smith' },
      ];

      attendanceRepository.find
        .mockResolvedValueOnce([
          {
            status: AttendanceStatus.PRESENT,
            training: mockTraining,
            match: null,
          },
          {
            status: AttendanceStatus.PRESENT,
            training: mockTraining,
            match: null,
          },
        ] as Attendance[])
        .mockResolvedValueOnce([
          {
            status: AttendanceStatus.ABSENT,
            training: mockTraining,
            match: null,
          },
        ] as Attendance[]);

      const result = await service.getStatsPerPlayer(players);

      expect(result).toHaveLength(2);
      expect(result[0].playerName).toBe('John Doe');
      expect(result[0].present).toBe(2);
      expect(result[0].rate).toBe(100);
      expect(result[1].playerName).toBe('Jane Smith');
      expect(result[1].absent).toBe(1);
      expect(result[1].rate).toBe(0);
    });

    it('should handle empty player list', async () => {
      const result = await service.getStatsPerPlayer([]);

      expect(result).toEqual([]);
    });
  });
});
