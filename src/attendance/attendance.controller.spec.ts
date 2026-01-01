import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';
import { Attendance } from './entities/attendance.entity';
import { AttendanceStatus } from './enums/attendance-status.enum';
import { EventType } from './dto/mark-attendance-batch.dto';
import { UserRole } from '../users/enums/user-role.enum';

describe('AttendanceController', () => {
  let controller: AttendanceController;
  let attendanceService: jest.Mocked<AttendanceService>;
  let playersRepository: jest.Mocked<Repository<Player>>;
  let parentsRepository: jest.Mocked<Repository<Parent>>;
  let trainingsRepository: jest.Mocked<Repository<Training>>;
  let matchesRepository: jest.Mocked<Repository<Match>>;

  const mockGroup = { id: 'group-123', name: 'U12' };
  const mockPlayer = { id: 'player-123', group: mockGroup } as unknown as Player;
  const mockTraining = { id: 'training-123', group: mockGroup } as unknown as Training;
  const mockMatch = { id: 'match-123', group: mockGroup } as unknown as Match;
  const mockAttendance = {
    id: 'attendance-123',
    player: mockPlayer,
    status: AttendanceStatus.PRESENT,
  } as unknown as Attendance;

  beforeEach(async () => {
    const mockAttendanceService = {
      markBatch: jest.fn(),
      findByEvent: jest.fn(),
      findByEventForPlayers: jest.fn(),
      getPlayerStats: jest.fn(),
      getStatsPerPlayer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        { provide: AttendanceService, useValue: mockAttendanceService },
        { provide: getRepositoryToken(Player), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Parent), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Training), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Match), useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AttendanceController>(AttendanceController);
    attendanceService = module.get(AttendanceService);
    playersRepository = module.get(getRepositoryToken(Player));
    parentsRepository = module.get(getRepositoryToken(Parent));
    trainingsRepository = module.get(getRepositoryToken(Training));
    matchesRepository = module.get(getRepositoryToken(Match));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markBatch', () => {
    it('should mark attendance batch', async () => {
      const dto = {
        eventId: 'training-123',
        eventType: EventType.TRAINING,
        records: [{ playerId: 'player-123', status: AttendanceStatus.PRESENT }],
      };
      attendanceService.markBatch.mockResolvedValue([mockAttendance]);

      const result = await controller.markBatch(dto);

      expect(attendanceService.markBatch).toHaveBeenCalledWith(dto);
      expect(result).toEqual([mockAttendance]);
    });
  });

  describe('getTrainingAttendance', () => {
    it('should return all attendance for admin', async () => {
      const req = { user: { id: 'admin-id', role: UserRole.ADMIN } };
      attendanceService.findByEvent.mockResolvedValue([mockAttendance]);

      const result = await controller.getTrainingAttendance('training-123', req);

      expect(attendanceService.findByEvent).toHaveBeenCalledWith('training-123', EventType.TRAINING);
      expect(result).toEqual([mockAttendance]);
    });

    it('should return all attendance for coach', async () => {
      const req = { user: { id: 'coach-id', role: UserRole.COACH } };
      attendanceService.findByEvent.mockResolvedValue([mockAttendance]);

      const result = await controller.getTrainingAttendance('training-123', req);

      expect(attendanceService.findByEvent).toHaveBeenCalledWith('training-123', EventType.TRAINING);
    });

    it('should return only player attendance for player', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PLAYER } };
      trainingsRepository.findOne.mockResolvedValue(mockTraining);
      playersRepository.findOne.mockResolvedValue(mockPlayer);
      attendanceService.findByEventForPlayers.mockResolvedValue([mockAttendance]);

      const result = await controller.getTrainingAttendance('training-123', req);

      expect(attendanceService.findByEventForPlayers).toHaveBeenCalledWith(
        'training-123',
        EventType.TRAINING,
        ['player-123'],
      );
    });

    it('should throw ForbiddenException when training not found', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PLAYER } };
      trainingsRepository.findOne.mockResolvedValue(null);

      await expect(controller.getTrainingAttendance('nonexistent', req)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when player not in group', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PLAYER } };
      trainingsRepository.findOne.mockResolvedValue(mockTraining);
      playersRepository.findOne.mockResolvedValue({
        ...mockPlayer,
        group: { id: 'different-group' },
      } as Player);

      await expect(controller.getTrainingAttendance('training-123', req)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return children attendance for parent', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PARENT } };
      const parent = { children: [mockPlayer] } as unknown as Parent;
      trainingsRepository.findOne.mockResolvedValue(mockTraining);
      parentsRepository.findOne.mockResolvedValue(parent);
      attendanceService.findByEventForPlayers.mockResolvedValue([mockAttendance]);

      const result = await controller.getTrainingAttendance('training-123', req);

      expect(attendanceService.findByEventForPlayers).toHaveBeenCalledWith(
        'training-123',
        EventType.TRAINING,
        ['player-123'],
      );
    });

    it('should throw ForbiddenException when parent has no children in group', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PARENT } };
      const parent = {
        children: [{ ...mockPlayer, group: { id: 'different-group' } }],
      } as unknown as Parent;
      trainingsRepository.findOne.mockResolvedValue(mockTraining);
      parentsRepository.findOne.mockResolvedValue(parent);

      await expect(controller.getTrainingAttendance('training-123', req)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getMatchAttendance', () => {
    it('should return all attendance for admin', async () => {
      const req = { user: { id: 'admin-id', role: UserRole.ADMIN } };
      attendanceService.findByEvent.mockResolvedValue([mockAttendance]);

      const result = await controller.getMatchAttendance('match-123', req);

      expect(attendanceService.findByEvent).toHaveBeenCalledWith('match-123', EventType.MATCH);
    });

    it('should return only player attendance for player', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PLAYER } };
      matchesRepository.findOne.mockResolvedValue(mockMatch);
      playersRepository.findOne.mockResolvedValue(mockPlayer);
      attendanceService.findByEventForPlayers.mockResolvedValue([mockAttendance]);

      await controller.getMatchAttendance('match-123', req);

      expect(attendanceService.findByEventForPlayers).toHaveBeenCalledWith(
        'match-123',
        EventType.MATCH,
        ['player-123'],
      );
    });

    it('should throw ForbiddenException when match not found', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PLAYER } };
      matchesRepository.findOne.mockResolvedValue(null);

      await expect(controller.getMatchAttendance('nonexistent', req)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getMyStats', () => {
    it('should return stats for player', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PLAYER } };
      const stats = { total: 10, present: 8, rate: 80 };
      playersRepository.findOne.mockResolvedValue(mockPlayer);
      attendanceService.getPlayerStats.mockResolvedValue(stats as any);

      const result = await controller.getMyStats(req);

      expect(attendanceService.getPlayerStats).toHaveBeenCalledWith(['player-123']);
      expect(result).toEqual(stats);
    });

    it('should throw ForbiddenException when player not found', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PLAYER } };
      playersRepository.findOne.mockResolvedValue(null);

      await expect(controller.getMyStats(req)).rejects.toThrow(ForbiddenException);
    });

    it('should return per-child stats for parent', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PARENT } };
      const parent = { children: [mockPlayer] } as unknown as Parent;
      const stats = [{ playerName: 'John', rate: 80 }];
      parentsRepository.findOne.mockResolvedValue(parent);
      attendanceService.getStatsPerPlayer.mockResolvedValue(stats as any);

      const result = await controller.getMyStats(req);

      expect(attendanceService.getStatsPerPlayer).toHaveBeenCalledWith([mockPlayer]);
      expect(result).toEqual(stats);
    });

    it('should throw ForbiddenException when parent has no children', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PARENT } };
      parentsRepository.findOne.mockResolvedValue({ children: [] } as unknown as Parent);

      await expect(controller.getMyStats(req)).rejects.toThrow(ForbiddenException);
    });
  });
});
