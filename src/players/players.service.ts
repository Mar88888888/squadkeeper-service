import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { getErrorMessage } from '../common/utils/error.util';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { Player } from './entities/player.entity';
import { hashPassword } from '../auth/utils/password.util';
import { User } from '../users/entities/user.entity';
import { Parent } from '../parents/entities/parent.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);

  constructor(
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    private dataSource: DataSource,
  ) {}

  private syncPersonNames(
    player: Player,
    user: User,
    data: { firstName?: string; lastName?: string },
  ): void {
    if (data.firstName !== undefined) {
      player.firstName = data.firstName;
      user.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      player.lastName = data.lastName;
      user.lastName = data.lastName;
    }
  }

  async findOne(playerId: string): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    return player;
  }

  async findByIds(ids: string[]): Promise<Player[]> {
    if (ids.length === 0) return [];

    const players = await this.playersRepository.find({
      where: { id: In(ids) },
    });

    if (players.length !== ids.length) {
      const foundIds = new Set(players.map((p) => p.id));
      const missingIds = ids.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Players with IDs ${missingIds.join(', ')} not found`,
      );
    }

    return players;
  }

  async assignToGroup(playerIds: string[], groupId: string): Promise<void> {
    if (playerIds.length === 0) return;

    await this.findByIds(playerIds);
    await this.playersRepository.update(
      { id: In(playerIds) },
      { group: { id: groupId } },
    );
  }

  async removeFromGroup(playerIds: string[], groupId?: string): Promise<void> {
    if (playerIds.length === 0 && !groupId) return;

    const query = this.playersRepository.createQueryBuilder().update(Player);

    if (playerIds.length > 0 && groupId) {
      query
        .set({ group: null })
        .where('id IN (:...playerIds)', { playerIds })
        .andWhere('groupId = :groupId', { groupId });
    } else if (groupId) {
      query.set({ group: null }).where('groupId = :groupId', { groupId });
    }

    await query.execute();
  }

  async findOneWithParent(playerId: string): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
      relations: ['parent'],
    });

    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    return player;
  }

  async setParent(playerId: string, parent: Parent | null): Promise<void> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    player.parent = parent;
    await this.playersRepository.save(player);
  }

  async findByUserId(userId: string): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: { user: { id: userId } },
      relations: ['group'],
    });

    if (!player) {
      throw new NotFoundException('Player profile not found');
    }

    return player;
  }

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

    if (!player?.user) return;

    await this.dataSource.manager.delete(User, player.user.id);
  }

  async create(createPlayerDto: CreatePlayerDto): Promise<Player> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existingUser = await manager.findOne(User, {
          where: { email: createPlayerDto.email },
        });

        if (existingUser) {
          throw new ConflictException('Email already exists');
        }

        const hashedPassword = await hashPassword(createPlayerDto.password);

        const user = manager.create(User, {
          email: createPlayerDto.email,
          passwordHash: hashedPassword,
          role: UserRole.PLAYER,
        });

        const player = manager.create(Player, {
          position: createPlayerDto.position,
          height: createPlayerDto.height,
          weight: createPlayerDto.weight,
          strongFoot: createPlayerDto.strongFoot,
          phoneNumber: createPlayerDto.phoneNumber,
          dateOfBirth: new Date(createPlayerDto.dateOfBirth),
          user,
        });

        this.syncPersonNames(player, user, {
          firstName: createPlayerDto.firstName,
          lastName: createPlayerDto.lastName,
        });

        await manager.save(user);
        await manager.save(player);

        return player;
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Failed to create player', error);
      throw new InternalServerErrorException(
        `Failed to create player: ${getErrorMessage(error)}`,
      );
    }
  }

  async update(id: string, updatePlayerDto: UpdatePlayerDto): Promise<Player> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const player = await manager.findOne(Player, {
          where: { id },
          relations: ['user', 'group', 'parent'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!player) {
          throw new NotFoundException('Player not found');
        }

        const { email, password, firstName, lastName } = updatePlayerDto;

        if (player.user) {
          if (email !== undefined && email !== player.user.email) {
            const existingUser = await manager.findOne(User, {
              where: { email },
            });
            if (existingUser) {
              throw new ConflictException('Email already exists');
            }
            player.user.email = email;
          }

          if (password !== undefined) {
            player.user.passwordHash = await hashPassword(password);
          }
        }

        this.syncPersonNames(player, player.user, { firstName, lastName });

        if (updatePlayerDto.phoneNumber !== undefined)
          player.phoneNumber = updatePlayerDto.phoneNumber;
        if (updatePlayerDto.dateOfBirth !== undefined)
          player.dateOfBirth = new Date(updatePlayerDto.dateOfBirth);
        if (updatePlayerDto.position !== undefined)
          player.position = updatePlayerDto.position;
        if (updatePlayerDto.height !== undefined)
          player.height = updatePlayerDto.height;
        if (updatePlayerDto.weight !== undefined)
          player.weight = updatePlayerDto.weight;
        if (updatePlayerDto.strongFoot !== undefined)
          player.strongFoot = updatePlayerDto.strongFoot;

        await manager.save([player.user, player]);

        return player;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ConflictException) throw error;
      this.logger.error('Failed to update player', error);
      throw new InternalServerErrorException(
        `Failed to update player: ${getErrorMessage(error)}`,
      );
    }
  }
}
