import { Test, TestingModule } from '@nestjs/testing';
import { CoachesController } from './coaches.controller';
import { CoachesService } from './coaches.service';
import { Coach } from './entities/coach.entity';

describe('CoachesController', () => {
  let controller: CoachesController;
  let coachesService: jest.Mocked<CoachesService>;

  const mockCoach = {
    id: 'coach-123',
    firstName: 'John',
    lastName: 'Coach',
    licenseLevel: 'UEFA B',
    experienceYears: 5,
  } as unknown as Coach;

  beforeEach(async () => {
    const mockCoachesService = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoachesController],
      providers: [{ provide: CoachesService, useValue: mockCoachesService }],
    }).compile();

    controller = module.get<CoachesController>(CoachesController);
    coachesService = module.get(CoachesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all coaches', async () => {
      coachesService.findAll.mockResolvedValue([mockCoach]);

      const result = await controller.findAll();

      expect(coachesService.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockCoach]);
    });
  });

  describe('create', () => {
    it('should create a coach', async () => {
      const createDto = {
        email: 'coach@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Coach',
        dateOfBirth: '1985-01-15',
        phoneNumber: '+1234567890',
        licenseLevel: 'UEFA B',
        experienceYears: 5,
      };
      coachesService.create.mockResolvedValue(mockCoach);

      const result = await controller.create(createDto);

      expect(coachesService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockCoach);
    });
  });

  describe('update', () => {
    it('should update a coach', async () => {
      const updateDto = { firstName: 'Updated', licenseLevel: 'UEFA A' };
      const updatedCoach = { ...mockCoach, ...updateDto };
      coachesService.update.mockResolvedValue(updatedCoach as Coach);

      const result = await controller.update('coach-123', updateDto);

      expect(coachesService.update).toHaveBeenCalledWith('coach-123', updateDto);
      expect(result.firstName).toBe('Updated');
      expect(result.licenseLevel).toBe('UEFA A');
    });
  });

  describe('remove', () => {
    it('should remove a coach', async () => {
      coachesService.remove.mockResolvedValue(undefined);

      await controller.remove('coach-123');

      expect(coachesService.remove).toHaveBeenCalledWith('coach-123');
    });
  });
});
