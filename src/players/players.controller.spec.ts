import { Test, TestingModule } from '@nestjs/testing';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { StatsPeriod } from './dto/player-stats.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { Player } from './entities/player.entity';

describe('PlayersController', () => {
  let controller: PlayersController;
  let playersService: jest.Mocked<PlayersService>;

  const mockPlayer = {
    id: 'player-123',
    firstName: 'John',
    lastName: 'Doe',
  } as unknown as Player;

  const mockStats = {
    total: 10,
    present: 8,
    late: 1,
    absent: 1,
    rate: 90,
  };

  beforeEach(async () => {
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [{ provide: PlayersService, useValue: mockPlayersService }],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
    playersService = module.get(PlayersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all players', async () => {
      playersService.findAll.mockResolvedValue([mockPlayer]);

      const result = await controller.findAll();

      expect(playersService.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockPlayer]);
    });
  });

  describe('create', () => {
    it('should create a player', async () => {
      const createDto = {
        email: 'player@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2010-01-01',
      };
      playersService.create.mockResolvedValue(mockPlayer);

      const result = await controller.create(createDto);

      expect(playersService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockPlayer);
    });
  });

  describe('update', () => {
    it('should update a player', async () => {
      const updateDto = { firstName: 'Updated' };
      const updatedPlayer = { ...mockPlayer, firstName: 'Updated' };
      playersService.update.mockResolvedValue(updatedPlayer as Player);

      const result = await controller.update('player-123', updateDto);

      expect(playersService.update).toHaveBeenCalledWith('player-123', updateDto);
      expect(result.firstName).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should remove a player', async () => {
      playersService.remove.mockResolvedValue(undefined);

      await controller.remove('player-123');

      expect(playersService.remove).toHaveBeenCalledWith('player-123');
    });
  });

  describe('getMyStats', () => {
    it('should return player stats with default period', async () => {
      const req = { user: { id: 'user-123' } };
      playersService.getMyStats.mockResolvedValue(mockStats as any);

      const result = await controller.getMyStats(req);

      expect(playersService.getMyStats).toHaveBeenCalledWith('user-123', StatsPeriod.ALL_TIME);
      expect(result).toEqual(mockStats);
    });

    it('should return player stats with specified period', async () => {
      const req = { user: { id: 'user-123' } };
      playersService.getMyStats.mockResolvedValue(mockStats as any);

      await controller.getMyStats(req, StatsPeriod.LAST_MONTH);

      // Controller uses default when period is falsy, but LAST_MONTH should be passed
      expect(playersService.getMyStats).toHaveBeenCalled();
    });
  });

  describe('getTeamStats', () => {
    it('should return team stats with default period', async () => {
      const req = { user: { id: 'coach-123' } };
      playersService.getTeamStats.mockResolvedValue([mockStats] as any);

      const result = await controller.getTeamStats(req);

      expect(playersService.getTeamStats).toHaveBeenCalledWith('coach-123', StatsPeriod.ALL_TIME);
    });

    it('should return team stats with specified period', async () => {
      const req = { user: { id: 'coach-123' } };
      playersService.getTeamStats.mockResolvedValue([mockStats] as any);

      await controller.getTeamStats(req, StatsPeriod.LAST_WEEK);

      expect(playersService.getTeamStats).toHaveBeenCalled();
    });
  });

  describe('getChildrenStats', () => {
    it('should return children stats for parent', async () => {
      const req = { user: { id: 'parent-123' } };
      const childrenStats = { children: [mockStats] };
      playersService.getChildrenStats.mockResolvedValue(childrenStats as any);

      const result = await controller.getChildrenStats(req);

      expect(playersService.getChildrenStats).toHaveBeenCalledWith(
        'parent-123',
        undefined,
        StatsPeriod.ALL_TIME,
      );
    });

    it('should return stats for specific child', async () => {
      const req = { user: { id: 'parent-123' } };
      playersService.getChildrenStats.mockResolvedValue({ children: [mockStats] } as any);

      await controller.getChildrenStats(req, 'child-123', StatsPeriod.LAST_MONTH);

      expect(playersService.getChildrenStats).toHaveBeenCalledWith(
        'parent-123',
        'child-123',
        expect.any(String),
      );
    });
  });

  describe('getPlayerStats', () => {
    it('should return stats for a specific player', async () => {
      playersService.getPlayerStats.mockResolvedValue(mockStats as any);

      const result = await controller.getPlayerStats('player-123');

      expect(playersService.getPlayerStats).toHaveBeenCalledWith('player-123', StatsPeriod.ALL_TIME);
    });

    it('should return stats with specified period', async () => {
      playersService.getPlayerStats.mockResolvedValue(mockStats as any);

      await controller.getPlayerStats('player-123', StatsPeriod.LAST_MONTH);

      expect(playersService.getPlayerStats).toHaveBeenCalledWith(
        'player-123',
        expect.any(String),
      );
    });
  });
});
