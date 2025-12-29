import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Parent } from './entities/parent.entity';
import { User } from '../users/entities/user.entity';
import { Player } from '../players/entities/player.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateParentDto } from './dto/create-parent.dto';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(Parent)
    private parentsRepository: Repository<Parent>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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

  async remove(id: string): Promise<void> {
    const parent = await this.parentsRepository.findOne({
      where: { id },
      relations: ['user', 'children'],
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Unlink children first
      if (parent.children && parent.children.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(Player)
          .set({ parent: null })
          .where('parentId = :parentId', { parentId: id })
          .execute();
      }

      const userId = parent.user?.id;

      // Break the bidirectional reference from User to Parent
      if (userId) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(User)
          .set({ parent: null as unknown as Parent })
          .where('id = :userId', { userId })
          .execute();
      }

      // Now we can safely remove the parent
      await queryRunner.manager.remove(parent);

      // Finally delete the user
      if (userId) {
        await queryRunner.manager.delete(User, userId);
      }

      await queryRunner.commitTransaction();
    } catch {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Failed to delete parent');
    } finally {
      await queryRunner.release();
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
      throw new NotFoundException('Player not found or not linked to this parent');
    }

    player.parent = null as unknown as Parent;
    await this.playersRepository.save(player);

    return this.parentsRepository.findOne({
      where: { id: parentId },
      relations: ['user', 'children'],
    }) as Promise<Parent>;
  }

  async create(createParentDto: CreateParentDto): Promise<Parent> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if email already exists
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: createParentDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createParentDto.password, 10);

      // Create User
      const user = queryRunner.manager.create(User, {
        email: createParentDto.email,
        passwordHash: hashedPassword,
        role: UserRole.PARENT,
        firstName: createParentDto.firstName,
        lastName: createParentDto.lastName,
      });

      await queryRunner.manager.save(user);

      // Create Parent Profile
      const parent = queryRunner.manager.create(Parent, {
        firstName: createParentDto.firstName,
        lastName: createParentDto.lastName,
        phoneNumber: createParentDto.phoneNumber,
        user,
      });

      await queryRunner.manager.save(parent);

      // Link User to Parent
      user.parent = parent;
      await queryRunner.manager.save(user);

      // Linking Logic: If childrenIds is provided and not empty
      if (
        createParentDto.childrenIds &&
        createParentDto.childrenIds.length > 0
      ) {
        // Verify all players exist
        const players = await queryRunner.manager.find(Player, {
          where: { id: In(createParentDto.childrenIds) },
        });

        if (players.length !== createParentDto.childrenIds.length) {
          throw new NotFoundException('One or more players not found');
        }

        // Update players with parentId
        await queryRunner.manager
          .createQueryBuilder()
          .update(Player)
          .set({ parent })
          .where('id IN (:...ids)', { ids: createParentDto.childrenIds })
          .execute();
      }

      await queryRunner.commitTransaction();

      return parent;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create parent');
    } finally {
      await queryRunner.release();
    }
  }
}
