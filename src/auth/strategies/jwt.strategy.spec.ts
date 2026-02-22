import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { UserRole } from '../../users/enums/user-role.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should return user data from JWT payload', () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PLAYER,
        groupIds: ['group-1', 'group-2'],
        playerId: 'player-123',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PLAYER,
        groupIds: ['group-1', 'group-2'],
        playerId: 'player-123',
        coachId: undefined,
        children: undefined,
      });
    });

    it('should handle coach user with coachId', () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'coach@example.com',
        firstName: 'Jane',
        lastName: 'Coach',
        role: UserRole.COACH,
        groupIds: ['group-1'],
        coachId: 'coach-456',
      };

      const result = strategy.validate(payload);

      expect(result.role).toBe(UserRole.COACH);
      expect(result.coachId).toBe('coach-456');
      expect(result.groupIds).toEqual(['group-1']);
    });

    it('should handle parent user with children', () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'parent@example.com',
        firstName: 'Parent',
        lastName: 'User',
        role: UserRole.PARENT,
        groupIds: ['group-1', 'group-2'],
        children: [
          { id: 'child-1', groupId: 'group-1' },
          { id: 'child-2', groupId: 'group-2' },
        ],
      };

      const result = strategy.validate(payload);

      expect(result.role).toBe(UserRole.PARENT);
      expect(result.children).toEqual([
        { id: 'child-1', groupId: 'group-1' },
        { id: 'child-2', groupId: 'group-2' },
      ]);
    });

    it('should handle admin user', () => {
      const payload: JwtPayload = {
        sub: 'admin-123',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        groupIds: [],
      };

      const result = strategy.validate(payload);

      expect(result.role).toBe(UserRole.ADMIN);
      expect(result.groupIds).toEqual([]);
    });

    it('should default groupIds to empty array if undefined', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PLAYER,
      } as JwtPayload;

      const result = strategy.validate(payload);

      expect(result.groupIds).toEqual([]);
    });
  });
});
