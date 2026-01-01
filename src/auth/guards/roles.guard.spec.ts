import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext({ role: UserRole.PLAYER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.ADMIN });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.COACH]);
      const context = createMockExecutionContext({ role: UserRole.COACH });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.PLAYER });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user is not present in request', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(null);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should check roles from both handler and class', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.ADMIN });

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should work with PLAYER role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.PLAYER]);
      const context = createMockExecutionContext({ role: UserRole.PLAYER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should work with COACH role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.COACH]);
      const context = createMockExecutionContext({ role: UserRole.COACH });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should work with PARENT role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.PARENT]);
      const context = createMockExecutionContext({ role: UserRole.PARENT });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny PLAYER when only ADMIN is required', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.PLAYER });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should deny PARENT when COACH or ADMIN is required', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.COACH, UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.PARENT });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });
});
