import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Parent } from './entities/parent.entity';
import { User } from '../users/entities/user.entity';
import { Player } from '../players/entities/player.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';

@Injectable()
export class ParentsService {
  private readonly logger = new Logger(ParentsService.name);

  constructor(
    @InjectRepository(Parent)
    private parentsRepository: Repository<Parent>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    private dataSource: DataSource,
  ) {}

  async findAll(): Promise<Parent[]> {
    return this.parentsRepository.find({
      relations: ['user', 'children'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async findByUserId(userId: string): Promise<Parent> {
    const parent = await this.parentsRepository.findOne({
      where: { user: { id: userId } },
      relations: ['children', 'children.group'],
    });

    if (!parent) {
      throw new NotFoundException('Parent profile not found');
    }

    return parent;
  }

  async remove(id: string): Promise<void> {
    const parent = await this.parentsRepository.findOne({
      where: { id },
      relations: ['user', 'children'],
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        if (parent.children && parent.children.length > 0) {
          await manager
            .createQueryBuilder()
            .update(Player)
            .set({ parent: null })
            .where('parentId = :parentId', { parentId: id })
            .execute();
        }

        const userId = parent.user?.id;

        if (userId) {
          await manager
            .createQueryBuilder()
            .update(User)
            .set({ parent: null as unknown as Parent })
            .where('id = :userId', { userId })
            .execute();
        }

        await manager.remove(parent);

        if (userId) {
          await manager.delete(User, userId);
        }
      });
    } catch (error) {
      this.logger.error('Failed to delete parent', error);
      throw new BadRequestException('Failed to delete parent');
    }
  }

  async linkChild(parentId: string, playerId: string): Promise<Parent> {
    const parent = await this.parentsRepository.findOne({
      where: { id: parentId },
      relations: ['children'],
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const player = await this.playersRepository.findOne({
      where: { id: playerId },
      relations: ['parent'],
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.parent?.id === parentId) {
      throw new BadRequestException('Player is already linked to this parent');
    }

    player.parent = parent;
    await this.playersRepository.save(player);

    return this.parentsRepository.findOne({
      where: { id: parentId },
      relations: ['user', 'children'],
    }) as Promise<Parent>;
  }

  async unlinkChild(parentId: string, playerId: string): Promise<Parent> {
    const parent = await this.parentsRepository.findOne({
      where: { id: parentId },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const player = await this.playersRepository.findOne({
      where: { id: playerId, parent: { id: parentId } },
    });

    if (!player) {
      throw new NotFoundException(
        'Player not found or not linked to this parent',
      );
    }

    player.parent = null as unknown as Parent;
    await this.playersRepository.save(player);

    return this.parentsRepository.findOne({
      where: { id: parentId },
      relations: ['user', 'children'],
    }) as Promise<Parent>;
  }

  async create(createParentDto: CreateParentDto): Promise<Parent> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existingUser = await manager.findOne(User, {
          where: { email: createParentDto.email },
        });

        if (existingUser) {
          throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(createParentDto.password, 10);

        const user = manager.create(User, {
          email: createParentDto.email,
          passwordHash: hashedPassword,
          role: UserRole.PARENT,
          firstName: createParentDto.firstName,
          lastName: createParentDto.lastName,
        });

        await manager.save(user);

        const parent = manager.create(Parent, {
          firstName: createParentDto.firstName,
          lastName: createParentDto.lastName,
          phoneNumber: createParentDto.phoneNumber,
          user,
        });

        await manager.save(parent);

        user.parent = parent;
        await manager.save(user);

        if (
          createParentDto.childrenIds &&
          createParentDto.childrenIds.length > 0
        ) {
          const players = await manager.find(Player, {
            where: { id: In(createParentDto.childrenIds) },
          });

          if (players.length !== createParentDto.childrenIds.length) {
            throw new NotFoundException('One or more players not found');
          }

          await manager
            .createQueryBuilder()
            .update(Player)
            .set({ parent })
            .where('id IN (:...ids)', { ids: createParentDto.childrenIds })
            .execute();
        }

        return parent;
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Failed to create parent', error);
      throw new BadRequestException('Failed to create parent');
    }
  }

  async update(id: string, updateParentDto: UpdateParentDto): Promise<Parent> {
    const parent = await this.parentsRepository.findOne({
      where: { id },
      relations: ['user', 'children'],
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const { email, password, firstName, lastName } = updateParentDto;

        if (parent.user) {
          if (email !== undefined && email !== parent.user.email) {
            const existingUser = await manager.findOne(User, { where: { email } });
            if (existingUser) {
              throw new ConflictException('Email already exists');
            }
            parent.user.email = email;
          }

          if (password !== undefined) {
            parent.user.passwordHash = await bcrypt.hash(password, 10);
          }
          if (firstName !== undefined) parent.user.firstName = firstName;
          if (lastName !== undefined) parent.user.lastName = lastName;

          await manager.save(parent.user);
        }

        if (firstName !== undefined) parent.firstName = firstName;
        if (lastName !== undefined) parent.lastName = lastName;
        if (updateParentDto.phoneNumber !== undefined) parent.phoneNumber = updateParentDto.phoneNumber;

        await manager.save(parent);

        return parent;
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error('Failed to update parent', error);
      throw new BadRequestException('Failed to update parent');
    }
  }
}
