import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtService } from '@nestjs/jwt';
import { PlayersController } from '../src/players/players.controller';
import { PlayersService } from '../src/players/players.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../src/users/enums/user-role.enum';
import { Player } from '../src/players/entities/player.entity';

describe('Players (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const mockPlayer = {
    id: 'player-123',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('2010-01-01'),
  } as unknown as Player;

  const mockPlayersService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getMyStats: jest.fn(),
    getTeamStats: jest.fn(),
    getChildrenStats: jest.fn(),
    getPlayerStats: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [
        { provide: PlayersService, useValue: mockPlayersService },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockImplementation((payload) => `token-${payload.role}`),
            verify: jest.fn().mockImplementation((token) => {
              if (token.includes('ADMIN')) return { sub: 'admin-id', role: UserRole.ADMIN };
              if (token.includes('PLAYER')) return { sub: 'player-id', role: UserRole.PLAYER };
              throw new Error('Invalid token');
            }),
          },
        },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          const authHeader = request.headers.authorization;
          if (!authHeader) return false;
          const token = authHeader.replace('Bearer ', '');
          if (token.includes('ADMIN')) {
            request.user = { id: 'admin-id', role: UserRole.ADMIN };
            return true;
          }
          if (token.includes('PLAYER')) {
            request.user = { id: 'player-id', role: UserRole.PLAYER };
            return true;
          }
          return false;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          const user = request.user;
          if (!user) return false;
          // Only ADMIN can access /players
          if (request.url === '/players' && request.method === 'GET') {
            return user.role === UserRole.ADMIN;
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /players', () => {
    it('should return all players for admin', async () => {
      mockPlayersService.findAll.mockResolvedValue([mockPlayer]);

      const response = await request(app.getHttpServer())
        .get('/players')
        .set('Authorization', 'Bearer token-ADMIN')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(mockPlayersService.findAll).toHaveBeenCalled();
    });

    it('should deny access for player role', async () => {
      await request(app.getHttpServer())
        .get('/players')
        .set('Authorization', 'Bearer token-PLAYER')
        .expect(403);
    });

    it('should deny access without token', async () => {
      await request(app.getHttpServer()).get('/players').expect(403);
    });
  });

  describe('POST /players', () => {
    const createPlayerDto = {
      email: 'newplayer@test.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'Player',
      dateOfBirth: '2010-01-01',
      position: 'Forward',
      height: 150,
      weight: 45,
      strongFoot: 'Right',
    };

    it('should create player for admin', async () => {
      mockPlayersService.create.mockResolvedValue(mockPlayer);

      const response = await request(app.getHttpServer())
        .post('/players')
        .set('Authorization', 'Bearer token-ADMIN')
        .send(createPlayerDto)
        .expect(201);

      expect(mockPlayersService.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'newplayer@test.com',
        firstName: 'New',
        lastName: 'Player',
      }));
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/players')
        .set('Authorization', 'Bearer token-ADMIN')
        .send({ firstName: 'Only' })
        .expect(400);
    });
  });
});
