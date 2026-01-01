import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactsService } from './contacts.service';
import { Coach } from '../coaches/entities/coach.entity';
import { User } from '../users/entities/user.entity';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { Group } from '../groups/entities/group.entity';
import { UserRole } from '../users/enums/user-role.enum';

describe('ContactsService', () => {
  let service: ContactsService;
  let coachesRepository: jest.Mocked<Repository<Coach>>;
  let usersRepository: jest.Mocked<Repository<User>>;
  let playersRepository: jest.Mocked<Repository<Player>>;
  let parentsRepository: jest.Mocked<Repository<Parent>>;

  const mockGroup = {
    id: 'group-123',
    name: 'U12',
    headCoach: null,
    assistants: [],
  } as unknown as Group;

  const mockUser = {
    id: 'user-123',
    email: 'coach@test.com',
    firstName: 'John',
    lastName: 'Coach',
    role: UserRole.COACH,
  } as unknown as User;

  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
  } as unknown as User;

  const mockCoach = {
    id: 'coach-123',
    firstName: 'John',
    lastName: 'Coach',
    phoneNumber: '+1234567890',
    user: mockUser,
    headGroups: [mockGroup],
    assistantGroups: [],
  } as unknown as Coach;

  const mockPlayer = {
    id: 'player-123',
    firstName: 'Player',
    lastName: 'One',
    group: { ...mockGroup, headCoach: mockCoach, assistants: [] },
  } as unknown as Player;

  beforeEach(async () => {
    const mockCoachesRepository = {
      find: jest.fn(),
    };

    const mockUsersRepository = {
      find: jest.fn(),
    };

    const mockPlayersRepository = {
      createQueryBuilder: jest.fn(),
    };

    const mockParentsRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: getRepositoryToken(Coach), useValue: mockCoachesRepository },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: getRepositoryToken(Player), useValue: mockPlayersRepository },
        { provide: getRepositoryToken(Parent), useValue: mockParentsRepository },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    coachesRepository = module.get(getRepositoryToken(Coach));
    usersRepository = module.get(getRepositoryToken(User));
    playersRepository = module.get(getRepositoryToken(Player));
    parentsRepository = module.get(getRepositoryToken(Parent));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getContacts', () => {
    beforeEach(() => {
      coachesRepository.find.mockResolvedValue([mockCoach]);
      usersRepository.find.mockResolvedValue([mockAdmin]);
    });

    it('should return contacts for admin', async () => {
      const result = await service.getContacts('admin-id', UserRole.ADMIN);

      expect(coachesRepository.find).toHaveBeenCalledWith({
        relations: ['user', 'headGroups', 'assistantGroups'],
        order: { lastName: 'ASC', firstName: 'ASC' },
      });
      expect(usersRepository.find).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN },
        order: { lastName: 'ASC', firstName: 'ASC' },
      });
      expect(result.coaches).toHaveLength(1);
      expect(result.admins).toHaveLength(1);
      expect(result.myCoachIds).toEqual([]);
    });

    it('should return contacts with myCoachIds for player', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockPlayer),
      };
      playersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getContacts('player-id', UserRole.PLAYER);

      expect(result.myCoachIds).toContain('coach-123');
    });

    it('should return empty myCoachIds when player has no group', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...mockPlayer, group: null }),
      };
      playersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getContacts('player-id', UserRole.PLAYER);

      expect(result.myCoachIds).toEqual([]);
    });

    it('should return contacts with myCoachIds for parent', async () => {
      const mockParent = {
        id: 'parent-123',
        children: [mockPlayer],
      };
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockParent),
      };
      parentsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getContacts('parent-id', UserRole.PARENT);

      expect(result.myCoachIds).toContain('coach-123');
    });

    it('should return empty myCoachIds when parent has no children', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ children: null }),
      };
      parentsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getContacts('parent-id', UserRole.PARENT);

      expect(result.myCoachIds).toEqual([]);
    });

    it('should return empty myCoachIds for coach role', async () => {
      const result = await service.getContacts('coach-id', UserRole.COACH);

      expect(result.myCoachIds).toEqual([]);
    });

    it('should include assistants in myCoachIds', async () => {
      const assistantCoach = { id: 'assistant-123' } as unknown as Coach;
      const playerWithAssistant = {
        ...mockPlayer,
        group: {
          ...mockGroup,
          headCoach: mockCoach,
          assistants: [assistantCoach],
        },
      };
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(playerWithAssistant),
      };
      playersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getContacts('player-id', UserRole.PLAYER);

      expect(result.myCoachIds).toContain('coach-123');
      expect(result.myCoachIds).toContain('assistant-123');
    });

    it('should format coach contacts correctly', async () => {
      const result = await service.getContacts('admin-id', UserRole.ADMIN);

      expect(result.coaches[0]).toEqual({
        id: 'coach-123',
        firstName: 'John',
        lastName: 'Coach',
        email: 'coach@test.com',
        phoneNumber: '+1234567890',
        role: UserRole.COACH,
        groups: [{ id: 'group-123', name: 'U12' }],
      });
    });

    it('should format admin contacts correctly', async () => {
      const result = await service.getContacts('admin-id', UserRole.ADMIN);

      expect(result.admins[0]).toEqual({
        id: 'admin-123',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        phoneNumber: null,
        role: UserRole.ADMIN,
      });
    });
  });
});
