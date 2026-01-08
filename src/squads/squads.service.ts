import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Squad } from './entities/squad.entity';
import { SquadPosition } from './entities/squad-position.entity';
import { Group } from '../groups/entities/group.entity';
import { Player } from '../players/entities/player.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { CreateSquadDto } from './dto/create-squad.dto';
import { UpdateSquadDto } from './dto/update-squad.dto';
import { UpdatePositionsDto } from './dto/update-positions.dto';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class SquadsService {
  constructor(
    @InjectRepository(Squad)
    private squadsRepository: Repository<Squad>,
    @InjectRepository(SquadPosition)
    private positionsRepository: Repository<SquadPosition>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
  ) {}

  async create(
    createSquadDto: CreateSquadDto,
    user: { userId: string; role: UserRole },
  ): Promise<Squad> {
    const group = await this.groupsRepository.findOne({
      where: { id: createSquadDto.groupId },
    });

    if (!group) {
      throw new NotFoundException(
        `Group with ID ${createSquadDto.groupId} not found`,
      );
    }

    // Verify coach has access to this group
    if (user.role === UserRole.COACH) {
      const hasAccess = await this.coachHasAccessToGroup(
        user.userId,
        createSquadDto.groupId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have access to this group',
        );
      }
    }

    // Get coach entity if user is a coach
    let createdBy: Coach | null = null;
    if (user.role === UserRole.COACH) {
      createdBy = await this.coachesRepository.findOne({
        where: { user: { id: user.userId } },
      });
    }

    const squad = this.squadsRepository.create({
      name: createSquadDto.name,
      gameFormat: createSquadDto.gameFormat,
      group,
      createdBy,
    });

    const savedSquad = await this.squadsRepository.save(squad);

    // Create positions if provided
    if (createSquadDto.positions && createSquadDto.positions.length > 0) {
      const positions = await this.createPositions(
        savedSquad,
        createSquadDto.positions,
      );
      savedSquad.positions = positions;
    }

    return savedSquad;
  }

  async findByGroup(groupId: string): Promise<Squad[]> {
    return await this.squadsRepository.find({
      where: { group: { id: groupId } },
      relations: ['group', 'createdBy', 'positions', 'positions.player'],
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Squad> {
    const squad = await this.squadsRepository.findOne({
      where: { id },
      relations: ['group', 'group.players', 'createdBy', 'positions', 'positions.player'],
    });

    if (!squad) {
      throw new NotFoundException(`Squad with ID ${id} not found`);
    }

    return squad;
  }

  async update(id: string, updateSquadDto: UpdateSquadDto): Promise<Squad> {
    const squad = await this.findOne(id);

    if (updateSquadDto.name !== undefined) {
      squad.name = updateSquadDto.name;
    }

    if (updateSquadDto.gameFormat !== undefined) {
      squad.gameFormat = updateSquadDto.gameFormat;
    }

    return await this.squadsRepository.save(squad);
  }

  async updatePositions(
    id: string,
    updatePositionsDto: UpdatePositionsDto,
  ): Promise<Squad> {
    const squad = await this.findOne(id);

    // Delete existing positions
    await this.positionsRepository.delete({ squad: { id } });

    // Create new positions
    const positions = await this.createPositions(
      squad,
      updatePositionsDto.positions,
    );
    squad.positions = positions;

    return squad;
  }

  async duplicate(id: string, newName: string): Promise<Squad> {
    const original = await this.findOne(id);

    const newSquad = this.squadsRepository.create({
      name: newName,
      gameFormat: original.gameFormat,
      group: original.group,
      createdBy: original.createdBy,
    });

    const savedSquad = await this.squadsRepository.save(newSquad);

    // Duplicate positions
    if (original.positions && original.positions.length > 0) {
      const positionsData = original.positions.map((pos) => ({
        playerId: pos.player?.id || null,
        role: pos.role,
        isStarter: pos.isStarter,
        orderIndex: pos.orderIndex,
      }));
      const positions = await this.createPositions(savedSquad, positionsData);
      savedSquad.positions = positions;
    }

    return savedSquad;
  }

  async remove(id: string): Promise<void> {
    const squad = await this.findOne(id);
    await this.squadsRepository.remove(squad);
  }

  private async createPositions(
    squad: Squad,
    positionsData: Array<{
      playerId?: string | null;
      role: string;
      isStarter: boolean;
      orderIndex: number;
    }>,
  ): Promise<SquadPosition[]> {
    const positions: SquadPosition[] = [];

    for (const posData of positionsData) {
      let player: Player | null = null;

      if (posData.playerId) {
        player = await this.playersRepository.findOne({
          where: { id: posData.playerId },
        });
      }

      const position = this.positionsRepository.create({
        squad,
        player,
        role: posData.role as any,
        isStarter: posData.isStarter,
        orderIndex: posData.orderIndex,
      });

      positions.push(await this.positionsRepository.save(position));
    }

    return positions;
  }

  private async coachHasAccessToGroup(
    userId: string,
    groupId: string,
  ): Promise<boolean> {
    const coach = await this.coachesRepository.findOne({
      where: { user: { id: userId } },
      relations: ['headGroups', 'assistantGroups'],
    });

    if (!coach) {
      return false;
    }

    const groupIds = [
      ...coach.headGroups.map((g) => g.id),
      ...coach.assistantGroups.map((g) => g.id),
    ];

    return groupIds.includes(groupId);
  }
}
