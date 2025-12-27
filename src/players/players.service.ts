import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Player } from './entities/player.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreatePlayerDto } from './dto/create-player.dto';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async findAll(): Promise<Player[]> {
    return this.playersRepository.find({
      relations: ['user', 'group', 'parent'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async remove(id: string): Promise<void> {
    const player = await this.playersRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userId = player.user?.id;

      // First, break the bidirectional reference from User to Player
      if (userId) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(User)
          .set({ player: null as unknown as Player })
          .where('id = :userId', { userId })
          .execute();
      }

      // Now we can safely remove the player
      await queryRunner.manager.remove(player);

      // Finally delete the user
      if (userId) {
        await queryRunner.manager.delete(User, userId);
      }

      await queryRunner.commitTransaction();
    } catch {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Failed to delete player');
    } finally {
      await queryRunner.release();
    }
  }

  async create(createPlayerDto: CreatePlayerDto): Promise<Player> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if email already exists
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: createPlayerDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createPlayerDto.password, 10);

      // Create User
      const user = queryRunner.manager.create(User, {
        email: createPlayerDto.email,
        passwordHash: hashedPassword,
        role: UserRole.PLAYER,
        firstName: createPlayerDto.firstName,
        lastName: createPlayerDto.lastName,
      });

      await queryRunner.manager.save(user);

      // Create Player Profile (parent is null initially)
      const player = queryRunner.manager.create(Player, {
        position: createPlayerDto.position,
        height: createPlayerDto.height,
        weight: createPlayerDto.weight,
        strongFoot: createPlayerDto.strongFoot,
        firstName: createPlayerDto.firstName,
        lastName: createPlayerDto.lastName,
        phoneNumber: createPlayerDto.phoneNumber,
        dateOfBirth: new Date(createPlayerDto.dateOfBirth),
        user,
        // parent is nullable and will be null by default
      });

      await queryRunner.manager.save(player);

      // Link User to Player
      user.player = player;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      return player;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create player');
    } finally {
      await queryRunner.release();
    }
  }
}
