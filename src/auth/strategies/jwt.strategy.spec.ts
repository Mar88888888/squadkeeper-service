import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersRepository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PLAYER,
  } as unknown as User;

  beforeEach(async () => {
    const mockUsersRepository = {
      findOne: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user data when user exists', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      const payload = { sub: 'user-123', email: 'test@example.com' };
      const result = await strategy.validate(payload);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PLAYER,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const payload = { sub: 'nonexistent', email: 'test@example.com' };

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should validate admin user', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      usersRepository.findOne.mockResolvedValue(adminUser as User);

      const payload = { sub: 'user-123' };
      const result = await strategy.validate(payload);

      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should validate coach user', async () => {
      const coachUser = { ...mockUser, role: UserRole.COACH };
      usersRepository.findOne.mockResolvedValue(coachUser as User);

      const payload = { sub: 'user-123' };
      const result = await strategy.validate(payload);

      expect(result.role).toBe(UserRole.COACH);
    });

    it('should validate parent user', async () => {
      const parentUser = { ...mockUser, role: UserRole.PARENT };
      usersRepository.findOne.mockResolvedValue(parentUser as User);

      const payload = { sub: 'user-123' };
      const result = await strategy.validate(payload);

      expect(result.role).toBe(UserRole.PARENT);
    });

    it('should not include password in returned user', async () => {
      const userWithPassword = { ...mockUser, passwordHash: 'secret' };
      usersRepository.findOne.mockResolvedValue(userWithPassword as User);

      const payload = { sub: 'user-123' };
      const result = await strategy.validate(payload);

      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
