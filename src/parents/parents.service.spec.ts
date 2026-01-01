import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ParentsService } from './parents.service';
import { Parent } from './entities/parent.entity';
import { User } from '../users/entities/user.entity';
import { Player } from '../players/entities/player.entity';
import { UserRole } from '../users/enums/user-role.enum';

jest.mock('bcrypt');

describe('ParentsService', () => {
  let service: ParentsService;
  let parentsRepository: jest.Mocked<Repository<Parent>>;
  let playersRepository: jest.Mocked<Repository<Player>>;
  let mockQueryRunner: any;

  const mockUser = {
    id: 'user-123',
    email: 'parent@test.com',
    role: UserRole.PARENT,
    firstName: 'John',
    lastName: 'Parent',
  } as unknown as User;

  const mockPlayer = {
    id: 'player-123',
    firstName: 'Child',
    lastName: 'One',
    parent: null,
  } as unknown as Player;

  const mockParent = {
    id: 'parent-123',
    firstName: 'John',
    lastName: 'Parent',
    phoneNumber: '+1234567890',
    user: mockUser,
    children: [],
  } as unknown as Parent;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
        delete: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const mockParentsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockUsersRepository = {
      findOne: jest.fn(),
    };

    const mockPlayersRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentsService,
        { provide: getRepositoryToken(Parent), useValue: mockParentsRepository },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: getRepositoryToken(Player), useValue: mockPlayersRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ParentsService>(ParentsService);
    parentsRepository = module.get(getRepositoryToken(Parent));
    playersRepository = module.get(getRepositoryToken(Player));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all parents ordered by name', async () => {
      parentsRepository.find.mockResolvedValue([mockParent]);

      const result = await service.findAll();

      expect(parentsRepository.find).toHaveBeenCalledWith({
        relations: ['user', 'children'],
        order: { lastName: 'ASC', firstName: 'ASC' },
      });
      expect(result).toEqual([mockParent]);
    });
  });

  describe('create', () => {
    const createParentDto = {
      email: 'newparent@test.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'Parent',
      phoneNumber: '+1234567890',
    };

    it('should create a parent with user', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.create(createParentDto);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(result).toBeDefined();
    });

    it('should throw ConflictException when email exists', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createParentDto)).rejects.toThrow(ConflictException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should create parent with children', async () => {
      const dtoWithChildren = {
        ...createParentDto,
        childrenIds: ['player-123', 'player-456'],
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.find.mockResolvedValue([
        { id: 'player-123' },
        { id: 'player-456' },
      ]);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.create(dtoWithChildren);

      expect(mockQueryRunner.manager.find).toHaveBeenCalled();
    });

    it('should throw NotFoundException when some children not found', async () => {
      const dtoWithChildren = {
        ...createParentDto,
        childrenIds: ['player-123', 'player-456'],
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.find.mockResolvedValue([{ id: 'player-123' }]);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve(entity));

      await expect(service.create(dtoWithChildren)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateParentDto = {
      firstName: 'Updated',
      lastName: 'Name',
      email: 'updated@test.com',
      phoneNumber: '+9876543210',
    };

    it('should update parent fields', async () => {
      parentsRepository.findOne.mockResolvedValue({ ...mockParent });
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.update('parent-123', updateParentDto);

      expect(parentsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'parent-123' },
        relations: ['user'],
      });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.firstName).toBe('Updated');
    });

    it('should throw NotFoundException when parent not found', async () => {
      parentsRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateParentDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when email taken by another user', async () => {
      const parentWithUser = { ...mockParent, user: { ...mockUser, id: 'user-123' } };
      parentsRepository.findOne.mockResolvedValue(parentWithUser as unknown as Parent);
      mockQueryRunner.manager.findOne.mockResolvedValue({ ...mockUser, id: 'different-user' });

      await expect(service.update('parent-123', updateParentDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update password when provided', async () => {
      parentsRepository.findOne.mockResolvedValue({ ...mockParent });
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve(entity));
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await service.update('parent-123', { password: 'newpassword' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
    });
  });

  describe('remove', () => {
    it('should remove parent and user', async () => {
      parentsRepository.findOne.mockResolvedValue({ ...mockParent, children: [] });
      mockQueryRunner.manager.remove.mockResolvedValue(mockParent);
      mockQueryRunner.manager.delete.mockResolvedValue({ affected: 1 });

      await service.remove('parent-123');

      expect(mockQueryRunner.manager.remove).toHaveBeenCalled();
      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(User, 'user-123');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should unlink children before removing', async () => {
      const parentWithChildren = { ...mockParent, children: [mockPlayer] };
      parentsRepository.findOne.mockResolvedValue(parentWithChildren as unknown as Parent);
      mockQueryRunner.manager.remove.mockResolvedValue(mockParent);
      mockQueryRunner.manager.delete.mockResolvedValue({ affected: 1 });

      await service.remove('parent-123');

      expect(mockQueryRunner.manager.createQueryBuilder).toHaveBeenCalled();
    });

    it('should throw NotFoundException when parent not found', async () => {
      parentsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should rollback on error', async () => {
      parentsRepository.findOne.mockResolvedValue({ ...mockParent, children: [] });
      mockQueryRunner.manager.remove.mockRejectedValue(new Error('DB error'));

      await expect(service.remove('parent-123')).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('linkChild', () => {
    it('should link a child to parent', async () => {
      parentsRepository.findOne
        .mockResolvedValueOnce({ ...mockParent, children: [] })
        .mockResolvedValueOnce({ ...mockParent, children: [mockPlayer] });
      playersRepository.findOne.mockResolvedValue({ ...mockPlayer, parent: null });
      playersRepository.save.mockResolvedValue(mockPlayer);

      const result = await service.linkChild('parent-123', 'player-123');

      expect(playersRepository.save).toHaveBeenCalled();
      expect(result.children).toHaveLength(1);
    });

    it('should throw NotFoundException when parent not found', async () => {
      parentsRepository.findOne.mockResolvedValue(null);

      await expect(service.linkChild('nonexistent', 'player-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when player not found', async () => {
      parentsRepository.findOne.mockResolvedValue(mockParent);
      playersRepository.findOne.mockResolvedValue(null);

      await expect(service.linkChild('parent-123', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when already linked', async () => {
      parentsRepository.findOne.mockResolvedValue(mockParent);
      playersRepository.findOne.mockResolvedValue({
        ...mockPlayer,
        parent: { id: 'parent-123' },
      });

      await expect(service.linkChild('parent-123', 'player-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('unlinkChild', () => {
    it('should unlink a child from parent', async () => {
      parentsRepository.findOne
        .mockResolvedValueOnce(mockParent)
        .mockResolvedValueOnce({ ...mockParent, children: [] });
      playersRepository.findOne.mockResolvedValue({ ...mockPlayer, parent: mockParent });
      playersRepository.save.mockResolvedValue(mockPlayer);

      const result = await service.unlinkChild('parent-123', 'player-123');

      expect(playersRepository.save).toHaveBeenCalled();
      expect(result.children).toHaveLength(0);
    });

    it('should throw NotFoundException when parent not found', async () => {
      parentsRepository.findOne.mockResolvedValue(null);

      await expect(service.unlinkChild('nonexistent', 'player-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when player not linked to parent', async () => {
      parentsRepository.findOne.mockResolvedValue(mockParent);
      playersRepository.findOne.mockResolvedValue(null);

      await expect(service.unlinkChild('parent-123', 'player-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
