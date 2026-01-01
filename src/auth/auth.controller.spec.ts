import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '../users/enums/user-role.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PLAYER,
  };

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return access token on successful login', async () => {
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue({ access_token: 'jwt-token' });

      const result = await controller.login(loginDto);

      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ access_token: 'jwt-token' });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with correct message', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should work with admin credentials', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      authService.validateUser.mockResolvedValue(adminUser);
      authService.login.mockResolvedValue({ access_token: 'admin-jwt-token' });

      const result = await controller.login(loginDto);

      expect(result).toEqual({ access_token: 'admin-jwt-token' });
    });

    it('should work with coach credentials', async () => {
      const coachUser = { ...mockUser, role: UserRole.COACH };
      authService.validateUser.mockResolvedValue(coachUser);
      authService.login.mockResolvedValue({ access_token: 'coach-jwt-token' });

      const result = await controller.login(loginDto);

      expect(result).toEqual({ access_token: 'coach-jwt-token' });
    });

    it('should work with parent credentials', async () => {
      const parentUser = { ...mockUser, role: UserRole.PARENT };
      authService.validateUser.mockResolvedValue(parentUser);
      authService.login.mockResolvedValue({ access_token: 'parent-jwt-token' });

      const result = await controller.login(loginDto);

      expect(result).toEqual({ access_token: 'parent-jwt-token' });
    });
  });
});
