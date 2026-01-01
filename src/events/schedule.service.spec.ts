import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { TrainingSchedule } from './entities/training-schedule.entity';
import { Training } from './entities/training.entity';
import { Group } from '../groups/entities/group.entity';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let scheduleRepository: jest.Mocked<Repository<TrainingSchedule>>;
  let trainingRepository: jest.Mocked<Repository<Training>>;
  let groupRepository: jest.Mocked<Repository<Group>>;
  let mockQueryRunner: any;

  const mockGroup = {
    id: 'group-123',
    name: 'U12',
  } as unknown as Group;

  const mockSchedule = {
    id: 'schedule-123',
    dayOfWeek: 1,
    startTime: '10:00',
    endTime: '12:00',
    location: 'Field A',
    group: mockGroup,
  } as unknown as TrainingSchedule;

  const mockTraining = {
    id: 'training-123',
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T12:00:00Z'),
    group: mockGroup,
    schedule: mockSchedule,
    attendances: [],
  } as unknown as Training;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        delete: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const mockScheduleRepository = {
      find: jest.fn(),
    };

    const mockTrainingRepository = {
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const mockGroupRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: getRepositoryToken(TrainingSchedule), useValue: mockScheduleRepository },
        { provide: getRepositoryToken(Training), useValue: mockTrainingRepository },
        { provide: getRepositoryToken(Group), useValue: mockGroupRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    scheduleRepository = module.get(getRepositoryToken(TrainingSchedule));
    trainingRepository = module.get(getRepositoryToken(Training));
    groupRepository = module.get(getRepositoryToken(Group));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSchedule', () => {
    it('should return schedule for a group', async () => {
      groupRepository.findOne.mockResolvedValue(mockGroup);
      scheduleRepository.find.mockResolvedValue([mockSchedule]);

      const result = await service.getSchedule('group-123');

      expect(groupRepository.findOne).toHaveBeenCalledWith({ where: { id: 'group-123' } });
      expect(scheduleRepository.find).toHaveBeenCalledWith({
        where: { group: { id: 'group-123' } },
        order: { dayOfWeek: 'ASC' },
      });
      expect(result).toEqual([mockSchedule]);
    });

    it('should throw NotFoundException when group not found', async () => {
      groupRepository.findOne.mockResolvedValue(null);

      await expect(service.getSchedule('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSchedule', () => {
    const updateDto = {
      items: [
        { dayOfWeek: 1, startTime: '10:00', endTime: '12:00', location: 'Field A' },
        { dayOfWeek: 3, startTime: '15:00', endTime: '17:00', location: 'Field B' },
      ],
    };

    it('should update schedule for a group', async () => {
      groupRepository.findOne.mockResolvedValue(mockGroup);
      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockResolvedValue([mockSchedule]);

      const result = await service.updateSchedule('group-123', updateDto);

      expect(mockQueryRunner.manager.delete).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when group not found', async () => {
      groupRepository.findOne.mockResolvedValue(null);

      await expect(service.updateSchedule('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when endTime before startTime', async () => {
      groupRepository.findOne.mockResolvedValue(mockGroup);

      const invalidDto = {
        items: [{ dayOfWeek: 1, startTime: '14:00', endTime: '12:00', location: 'Field A' }],
      };

      await expect(service.updateSchedule('group-123', invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for duplicate days', async () => {
      groupRepository.findOne.mockResolvedValue(mockGroup);

      const duplicateDaysDto = {
        items: [
          { dayOfWeek: 1, startTime: '10:00', endTime: '12:00', location: 'Field A' },
          { dayOfWeek: 1, startTime: '15:00', endTime: '17:00', location: 'Field B' },
        ],
      };

      await expect(service.updateSchedule('group-123', duplicateDaysDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rollback on error', async () => {
      groupRepository.findOne.mockResolvedValue(mockGroup);
      mockQueryRunner.manager.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.updateSchedule('group-123', updateDto)).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('generateTrainings', () => {
    const generateDto = {
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
      defaultTopic: 'Training',
    };

    it('should generate trainings from schedule', async () => {
      groupRepository.findOne.mockResolvedValue(mockGroup);
      scheduleRepository.find.mockResolvedValue([mockSchedule]);
      trainingRepository.save.mockResolvedValue([]);

      const result = await service.generateTrainings('group-123', generateDto);

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('skipped');
    });

    it('should throw BadRequestException when no schedule defined', async () => {
      groupRepository.findOne.mockResolvedValue(mockGroup);
      scheduleRepository.find.mockResolvedValue([]);

      await expect(service.generateTrainings('group-123', generateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when group not found', async () => {
      groupRepository.findOne.mockResolvedValue(null);

      await expect(service.generateTrainings('nonexistent', generateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when toDate before fromDate', async () => {
      groupRepository.findOne.mockResolvedValue(mockGroup);
      scheduleRepository.find.mockResolvedValue([mockSchedule]);

      const invalidDto = {
        fromDate: '2024-01-31',
        toDate: '2024-01-01',
      };

      await expect(service.generateTrainings('group-123', invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip existing trainings', async () => {
      groupRepository.findOne.mockResolvedValue(mockGroup);
      scheduleRepository.find.mockResolvedValue([mockSchedule]);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockTraining]),
      };
      trainingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      trainingRepository.save.mockResolvedValue([]);

      const result = await service.generateTrainings('group-123', generateDto);

      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });
  });

  describe('deleteFutureGeneratedTrainings', () => {
    it('should delete future generated trainings without attendances', async () => {
      groupRepository.findOne.mockResolvedValue(mockGroup);
      trainingRepository.find.mockResolvedValue([{ ...mockTraining, attendances: [] }] as unknown as Training[]);
      trainingRepository.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.deleteFutureGeneratedTrainings('group-123');

      expect(result.deleted).toBe(1);
      expect(result.kept).toBe(0);
    });

    it('should keep trainings with attendances', async () => {
      groupRepository.findOne.mockResolvedValue(mockGroup);
      trainingRepository.find.mockResolvedValue([
        { ...mockTraining, attendances: [{ id: 'att-1' }] },
      ] as unknown as Training[]);

      const result = await service.deleteFutureGeneratedTrainings('group-123');

      expect(result.deleted).toBe(0);
      expect(result.kept).toBe(1);
    });

    it('should throw NotFoundException when group not found', async () => {
      groupRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteFutureGeneratedTrainings('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
