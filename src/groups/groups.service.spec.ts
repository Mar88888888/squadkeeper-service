import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { Group } from './entities/group.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { UserRole } from '../users/enums/user-role.enum';

describe('GroupsService', () => {
  let service: GroupsService;
  let groupsRepository: jest.Mocked<Repository<Group>>;
  let coachesRepository: jest.Mocked<Repository<Coach>>;
  let playersRepository: jest.Mocked<Repository<Player>>;
  let parentsRepository: jest.Mocked<Repository<Parent>>;

  const mockGroup = {
    id: 'group-123',
    name: 'U12',
    yearOfBirth: 2012,
    createdAt: new Date(),
    updatedAt: new Date(),
    headCoach: null,
    assistants: [],
    players: [],
  } as unknown as Group;

  const mockCoach = {
    id: 'coach-123',
    firstName: 'John',
    lastName: 'Coach',
    headGroups: [],
    assistantGroups: [],
  } as unknown as Coach;

  const mockPlayer = {
    id: 'player-123',
    firstName: 'Player',
    lastName: 'One',
    group: mockGroup,
  } as unknown as Player;

  beforeEach(async () => {
    const mockGroupsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const mockCoachesRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockPlayersRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockParentsRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: getRepositoryToken(Group), useValue: mockGroupsRepository },
        { provide: getRepositoryToken(Coach), useValue: mockCoachesRepository },
        { provide: getRepositoryToken(Player), useValue: mockPlayersRepository },
        { provide: getRepositoryToken(Parent), useValue: mockParentsRepository },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    groupsRepository = module.get(getRepositoryToken(Group));
    coachesRepository = module.get(getRepositoryToken(Coach));
    playersRepository = module.get(getRepositoryToken(Player));
    parentsRepository = module.get(getRepositoryToken(Parent));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a group without coaches', async () => {
      const createGroupDto = { name: 'U10', yearOfBirth: 2014 };
      const expectedGroup = { ...mockGroup, ...createGroupDto } as unknown as Group;

      groupsRepository.create.mockReturnValue(expectedGroup);
      groupsRepository.save.mockResolvedValue(expectedGroup);

      const result = await service.create(createGroupDto);

      expect(groupsRepository.create).toHaveBeenCalledWith(createGroupDto);
      expect(groupsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expectedGroup);
    });

    it('should create a group with head coach', async () => {
      const createGroupDto = {
        name: 'U10',
        yearOfBirth: 2014,
        headCoachId: 'coach-123',
      };
      const groupWithCoach = { ...mockGroup, headCoach: mockCoach } as unknown as Group;

      coachesRepository.findOne.mockResolvedValue(mockCoach);
      groupsRepository.create.mockReturnValue(groupWithCoach);
      groupsRepository.save.mockResolvedValue(groupWithCoach);

      const result = await service.create(createGroupDto);

      expect(coachesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'coach-123' },
      });
      expect(result.headCoach).toEqual(mockCoach);
    });

    it('should throw NotFoundException when head coach not found', async () => {
      const createGroupDto = {
        name: 'U10',
        yearOfBirth: 2014,
        headCoachId: 'nonexistent',
      };

      coachesRepository.findOne.mockResolvedValue(null);
      groupsRepository.create.mockReturnValue(mockGroup);

      await expect(service.create(createGroupDto)).rejects.toThrow(NotFoundException);
    });

    it('should create a group with assistants', async () => {
      const createGroupDto = {
        name: 'U10',
        yearOfBirth: 2014,
        assistantIds: ['coach-1', 'coach-2'],
      };

      const assistants = [
        { ...mockCoach, id: 'coach-1' },
        { ...mockCoach, id: 'coach-2' },
      ] as unknown as Coach[];
      const groupWithAssistants = { ...mockGroup, assistants } as unknown as Group;

      coachesRepository.find.mockResolvedValue(assistants);
      groupsRepository.create.mockReturnValue(groupWithAssistants);
      groupsRepository.save.mockResolvedValue(groupWithAssistants);

      const result = await service.create(createGroupDto);

      expect(coachesRepository.find).toHaveBeenCalled();
      expect(result.assistants).toHaveLength(2);
    });

    it('should throw NotFoundException when some assistants not found', async () => {
      const createGroupDto = {
        name: 'U10',
        yearOfBirth: 2014,
        assistantIds: ['coach-1', 'coach-2'],
      };

      coachesRepository.find.mockResolvedValue([{ ...mockCoach, id: 'coach-1' }] as unknown as Coach[]);
      groupsRepository.create.mockReturnValue(mockGroup);

      await expect(service.create(createGroupDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all groups with relations', async () => {
      const groups = [mockGroup, { ...mockGroup, id: 'group-456', name: 'U14' }] as unknown as Group[];
      groupsRepository.find.mockResolvedValue(groups);

      const result = await service.findAll();

      expect(groupsRepository.find).toHaveBeenCalledWith({
        relations: ['headCoach', 'assistants', 'players'],
      });
      expect(result).toEqual(groups);
    });
  });

  describe('findOne', () => {
    it('should return a group by id', async () => {
      groupsRepository.findOne.mockResolvedValue(mockGroup);

      const result = await service.findOne('group-123');

      expect(groupsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'group-123' },
        relations: ['headCoach', 'assistants', 'players'],
      });
      expect(result).toEqual(mockGroup);
    });

    it('should throw NotFoundException when group not found', async () => {
      groupsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCoachUserId', () => {
    it('should return groups for a coach', async () => {
      const coachWithGroups = {
        ...mockCoach,
        headGroups: [{ id: 'group-1' }],
        assistantGroups: [{ id: 'group-2' }],
      } as unknown as Coach;

      coachesRepository.findOne.mockResolvedValue(coachWithGroups);
      groupsRepository.find.mockResolvedValue([mockGroup]);

      const result = await service.findByCoachUserId('user-123');

      expect(coachesRepository.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'user-123' } },
        relations: ['headGroups', 'assistantGroups'],
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array when coach not found', async () => {
      coachesRepository.findOne.mockResolvedValue(null);

      const result = await service.findByCoachUserId('nonexistent');

      expect(result).toEqual([]);
    });

    it('should return empty array when coach has no groups', async () => {
      const coachWithoutGroups = {
        ...mockCoach,
        headGroups: [],
        assistantGroups: [],
      } as unknown as Coach;

      coachesRepository.findOne.mockResolvedValue(coachWithoutGroups);

      const result = await service.findByCoachUserId('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('findMyGroups', () => {
    it('should return all groups for admin', async () => {
      groupsRepository.find.mockResolvedValue([mockGroup]);

      const result = await service.findMyGroups('admin-id', UserRole.ADMIN);

      expect(groupsRepository.find).toHaveBeenCalledWith({
        relations: ['headCoach', 'assistants', 'players'],
      });
      expect(result).toHaveLength(1);
    });

    it('should return coach groups for coach role', async () => {
      const coachWithGroups = {
        ...mockCoach,
        headGroups: [{ id: 'group-1' }],
        assistantGroups: [],
      } as unknown as Coach;

      coachesRepository.findOne.mockResolvedValue(coachWithGroups);
      groupsRepository.find.mockResolvedValue([mockGroup]);

      await service.findMyGroups('coach-user-id', UserRole.COACH);

      expect(coachesRepository.findOne).toHaveBeenCalled();
    });

    it('should return player group for player role', async () => {
      const playerWithGroup = { ...mockPlayer, group: mockGroup } as unknown as Player;
      playersRepository.findOne.mockResolvedValue(playerWithGroup);
      groupsRepository.find.mockResolvedValue([mockGroup]);

      await service.findMyGroups('player-user-id', UserRole.PLAYER);

      expect(playersRepository.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'player-user-id' } },
        relations: ['group'],
      });
    });

    it('should return empty array when player has no group', async () => {
      playersRepository.findOne.mockResolvedValue({ ...mockPlayer, group: null } as unknown as Player);

      const result = await service.findMyGroups('player-user-id', UserRole.PLAYER);

      expect(result).toEqual([]);
    });

    it('should return children groups for parent role', async () => {
      const parentWithChildren = {
        id: 'parent-123',
        children: [{ ...mockPlayer, group: mockGroup }],
      } as unknown as Parent;

      parentsRepository.findOne.mockResolvedValue(parentWithChildren);
      groupsRepository.find.mockResolvedValue([mockGroup]);

      await service.findMyGroups('parent-user-id', UserRole.PARENT);

      expect(parentsRepository.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'parent-user-id' } },
        relations: ['children', 'children.group'],
      });
    });

    it('should return empty array for unknown role', async () => {
      const result = await service.findMyGroups('user-id', 'unknown' as UserRole);

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update group name', async () => {
      const updatedGroup = { ...mockGroup, name: 'U13' } as unknown as Group;
      groupsRepository.findOne.mockResolvedValue(mockGroup);
      groupsRepository.save.mockResolvedValue(updatedGroup);

      const result = await service.update('group-123', { name: 'U13' });

      expect(result.name).toBe('U13');
    });

    it('should update group yearOfBirth', async () => {
      const updatedGroup = { ...mockGroup, yearOfBirth: 2013 } as unknown as Group;
      groupsRepository.findOne.mockResolvedValue(mockGroup);
      groupsRepository.save.mockResolvedValue(updatedGroup);

      const result = await service.update('group-123', { yearOfBirth: 2013 });

      expect(result.yearOfBirth).toBe(2013);
    });
  });

  describe('updateStaff', () => {
    it('should update head coach', async () => {
      const groupWithCoach = { ...mockGroup, headCoach: mockCoach } as unknown as Group;
      groupsRepository.findOne.mockResolvedValue(mockGroup);
      coachesRepository.findOne.mockResolvedValue(mockCoach);
      groupsRepository.save.mockResolvedValue(groupWithCoach);

      const result = await service.updateStaff('group-123', { headCoachId: 'coach-123' });

      expect(result.headCoach).toEqual(mockCoach);
    });

    it('should remove head coach when null', async () => {
      const groupWithCoach = { ...mockGroup, headCoach: mockCoach } as unknown as Group;
      const groupWithoutCoach = { ...mockGroup, headCoach: null } as unknown as Group;
      groupsRepository.findOne.mockResolvedValue(groupWithCoach);
      groupsRepository.save.mockResolvedValue(groupWithoutCoach);

      const result = await service.updateStaff('group-123', { headCoachId: null as unknown as string });

      expect(result.headCoach).toBeNull();
    });

    it('should update assistants', async () => {
      const assistants = [{ ...mockCoach, id: 'coach-1' }] as unknown as Coach[];
      const groupWithAssistants = { ...mockGroup, assistants } as unknown as Group;
      groupsRepository.findOne.mockResolvedValue(mockGroup);
      coachesRepository.find.mockResolvedValue(assistants);
      groupsRepository.save.mockResolvedValue(groupWithAssistants);

      const result = await service.updateStaff('group-123', { assistantIds: ['coach-1'] });

      expect(result.assistants).toHaveLength(1);
    });
  });

  describe('addPlayers', () => {
    it('should add players to a group', async () => {
      const players = [mockPlayer, { ...mockPlayer, id: 'player-2' }] as unknown as Player[];
      const groupWithPlayers = { ...mockGroup, players } as unknown as Group;
      groupsRepository.findOne
        .mockResolvedValueOnce(mockGroup)
        .mockResolvedValueOnce(groupWithPlayers);
      playersRepository.find.mockResolvedValue(players);
      playersRepository.update.mockResolvedValue({ affected: 2 } as any);

      const result = await service.addPlayers('group-123', ['player-123', 'player-2']);

      expect(playersRepository.update).toHaveBeenCalled();
      expect(result.players).toHaveLength(2);
    });

    it('should throw NotFoundException when group not found', async () => {
      groupsRepository.findOne.mockResolvedValue(null);

      await expect(service.addPlayers('nonexistent', ['player-123']))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when some players not found', async () => {
      groupsRepository.findOne.mockResolvedValue(mockGroup);
      playersRepository.find.mockResolvedValue([mockPlayer]);

      await expect(service.addPlayers('group-123', ['player-123', 'nonexistent']))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('removePlayers', () => {
    it('should remove players from a group', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      groupsRepository.findOne.mockResolvedValue(mockGroup);
      playersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.removePlayers('group-123', ['player-123']);

      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a group and unassign players', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      };

      playersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      groupsRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove('group-123');

      expect(playersRepository.createQueryBuilder).toHaveBeenCalled();
      expect(groupsRepository.delete).toHaveBeenCalledWith('group-123');
    });

    it('should throw NotFoundException when group not found', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };

      playersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      groupsRepository.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
