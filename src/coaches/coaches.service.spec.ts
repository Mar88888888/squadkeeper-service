import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CoachesService } from './coaches.service';
import { Coach } from './entities/coach.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

jest.mock('bcrypt');

describe('CoachesService', () => {
  let service: CoachesService;
  let coachesRepository: jest.Mocked<Repository<Coach>>;
  let mockQueryRunner: any;

  const mockUser = {
    id: 'user-123',
    email: 'coach@test.com',
    role: UserRole.COACH,
    firstName: 'John',
    lastName: 'Coach',
  } as unknown as User;

  const mockCoach = {
    id: 'coach-123',
    firstName: 'John',
    lastName: 'Coach',
    licenseLevel: 'UEFA B',
    experienceYears: 5,
    phoneNumber: '+1234567890',
    dateOfBirth: new Date('1985-01-15'),
    user: mockUser,
    headGroups: [],
    assistantGroups: [],
  } as unknown as Coach;

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
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const mockCoachesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockUsersRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoachesService,
        { provide: getRepositoryToken(Coach), useValue: mockCoachesRepository },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<CoachesService>(CoachesService);
    coachesRepository = module.get(getRepositoryToken(Coach));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all coaches ordered by name', async () => {
      const coaches = [mockCoach];
      coachesRepository.find.mockResolvedValue(coaches);

      const result = await service.findAll();

      expect(coachesRepository.find).toHaveBeenCalledWith({
        relations: ['user'],
        order: { lastName: 'ASC', firstName: 'ASC' },
      });
      expect(result).toEqual(coaches);
    });
  });

  describe('create', () => {
    const createCoachDto = {
      email: 'newcoach@test.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'Coach',
      phoneNumber: '+1234567890',
      dateOfBirth: '1990-01-15',
      licenseLevel: 'UEFA A',
      experienceYears: 3,
    };

    it('should create a coach with user', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.create(createCoachDto);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(result).toBeDefined();
    });

    it('should throw ConflictException when email exists', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createCoachDto)).rejects.toThrow(ConflictException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockQueryRunner.manager.create.mockImplementation(() => {
        throw new Error('DB error');
      });

      await expect(service.create(createCoachDto)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateCoachDto = {
      firstName: 'Updated',
      lastName: 'Name',
      email: 'updated@test.com',
      phoneNumber: '+9876543210',
      licenseLevel: 'UEFA Pro',
      experienceYears: 10,
    };

    it('should update coach fields', async () => {
      coachesRepository.findOne.mockResolvedValue({ ...mockCoach });
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.update('coach-123', updateCoachDto);

      expect(coachesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'coach-123' },
        relations: ['user'],
      });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.firstName).toBe('Updated');
    });

    it('should throw NotFoundException when coach not found', async () => {
      coachesRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateCoachDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when email taken by another user', async () => {
      const coachWithUser = { ...mockCoach, user: { ...mockUser, id: 'user-123' } };
      coachesRepository.findOne.mockResolvedValue(coachWithUser as unknown as Coach);
      mockQueryRunner.manager.findOne.mockResolvedValue({ ...mockUser, id: 'different-user' });

      await expect(service.update('coach-123', updateCoachDto)).rejects.toThrow(ConflictException);
    });

    it('should update password when provided', async () => {
      coachesRepository.findOne.mockResolvedValue({ ...mockCoach });
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve(entity));
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await service.update('coach-123', { password: 'newpassword' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
    });
  });

  describe('remove', () => {
    it('should remove coach and user', async () => {
      coachesRepository.findOne.mockResolvedValue({ ...mockCoach });
      mockQueryRunner.manager.remove.mockResolvedValue(mockCoach);
      mockQueryRunner.manager.delete.mockResolvedValue({ affected: 1 });

      await service.remove('coach-123');

      expect(mockQueryRunner.manager.remove).toHaveBeenCalled();
      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(User, 'user-123');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when coach not found', async () => {
      coachesRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should rollback on error', async () => {
      coachesRepository.findOne.mockResolvedValue({ ...mockCoach });
      mockQueryRunner.manager.remove.mockRejectedValue(new Error('DB error'));

      await expect(service.remove('coach-123')).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
