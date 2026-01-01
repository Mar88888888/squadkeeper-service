import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group } from './entities/group.entity';
import { UserRole } from '../users/enums/user-role.enum';

describe('GroupsController', () => {
  let controller: GroupsController;
  let groupsService: jest.Mocked<GroupsService>;

  const mockGroup = {
    id: 'group-123',
    name: 'U12',
    yearOfBirth: 2012,
    headCoach: null,
    assistants: [],
    players: [],
  } as unknown as Group;

  beforeEach(async () => {
    const mockGroupsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findMyGroups: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStaff: jest.fn(),
      addPlayers: jest.fn(),
      removePlayers: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [{ provide: GroupsService, useValue: mockGroupsService }],
    }).compile();

    controller = module.get<GroupsController>(GroupsController);
    groupsService = module.get(GroupsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all groups', async () => {
      groupsService.findAll.mockResolvedValue([mockGroup]);

      const result = await controller.findAll();

      expect(groupsService.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockGroup]);
    });
  });

  describe('findOne', () => {
    it('should return a group by id', async () => {
      groupsService.findOne.mockResolvedValue(mockGroup);

      const result = await controller.findOne('group-123');

      expect(groupsService.findOne).toHaveBeenCalledWith('group-123');
      expect(result).toEqual(mockGroup);
    });
  });

  describe('findMyGroups', () => {
    it('should return groups for coach', async () => {
      const req = { user: { id: 'user-123', role: UserRole.COACH } };
      groupsService.findMyGroups.mockResolvedValue([mockGroup]);

      const result = await controller.findMyGroups(req);

      expect(groupsService.findMyGroups).toHaveBeenCalledWith('user-123', UserRole.COACH);
      expect(result).toEqual([mockGroup]);
    });

    it('should return groups for player', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PLAYER } };
      groupsService.findMyGroups.mockResolvedValue([mockGroup]);

      const result = await controller.findMyGroups(req);

      expect(groupsService.findMyGroups).toHaveBeenCalledWith('user-123', UserRole.PLAYER);
    });

    it('should return groups for parent', async () => {
      const req = { user: { id: 'user-123', role: UserRole.PARENT } };
      groupsService.findMyGroups.mockResolvedValue([mockGroup]);

      const result = await controller.findMyGroups(req);

      expect(groupsService.findMyGroups).toHaveBeenCalledWith('user-123', UserRole.PARENT);
    });
  });

  describe('create', () => {
    it('should create a group', async () => {
      const createDto = { name: 'U10', yearOfBirth: 2014 };
      groupsService.create.mockResolvedValue(mockGroup);

      const result = await controller.create(createDto);

      expect(groupsService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockGroup);
    });
  });

  describe('update', () => {
    it('should update a group', async () => {
      const updateDto = { name: 'U13' };
      const updatedGroup = { ...mockGroup, name: 'U13' };
      groupsService.update.mockResolvedValue(updatedGroup as Group);

      const result = await controller.update('group-123', updateDto);

      expect(groupsService.update).toHaveBeenCalledWith('group-123', updateDto);
      expect(result.name).toBe('U13');
    });
  });

  describe('updateStaff', () => {
    it('should update group staff', async () => {
      const staffDto = { headCoachId: 'coach-123', assistantIds: ['coach-456'] };
      groupsService.updateStaff.mockResolvedValue(mockGroup);

      const result = await controller.updateStaff('group-123', staffDto);

      expect(groupsService.updateStaff).toHaveBeenCalledWith('group-123', staffDto);
    });
  });

  describe('addPlayers', () => {
    it('should add players to group', async () => {
      const assignDto = { playerIds: ['player-1', 'player-2'] };
      groupsService.addPlayers.mockResolvedValue(mockGroup);

      const result = await controller.addPlayers('group-123', assignDto);

      expect(groupsService.addPlayers).toHaveBeenCalledWith('group-123', ['player-1', 'player-2']);
    });
  });

  describe('removePlayers', () => {
    it('should remove players from group', async () => {
      const assignDto = { playerIds: ['player-1'] };
      groupsService.removePlayers.mockResolvedValue(undefined);

      await controller.removePlayers('group-123', assignDto);

      expect(groupsService.removePlayers).toHaveBeenCalledWith('group-123', ['player-1']);
    });
  });

  describe('remove', () => {
    it('should remove a group', async () => {
      groupsService.remove.mockResolvedValue(undefined);

      await controller.remove('group-123');

      expect(groupsService.remove).toHaveBeenCalledWith('group-123');
    });
  });
});
