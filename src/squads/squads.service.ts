import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Squad } from './entities/squad.entity';
import { SquadPosition } from './entities/squad-position.entity';
import { Player } from '../players/entities/player.entity';
import { GroupsService } from '../groups/groups.service';
import { CoachesService } from '../coaches/coaches.service';
import { PermissionsService } from '../auth/permissions.service';
import { CreateSquadDto } from './dto/create-squad.dto';
import { UpdateSquadDto } from './dto/update-squad.dto';
import { UpdatePositionsDto } from './dto/update-positions.dto';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';
import { Position } from '../players/enums/position.enum';

@Injectable()
export class SquadsService {
  private readonly logger = new Logger(SquadsService.name);

  constructor(
    @InjectRepository(Squad)
    private squadsRepository: Repository<Squad>,
    @InjectRepository(SquadPosition)
    private positionsRepository: Repository<SquadPosition>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    private groupsService: GroupsService,
    private coachesService: CoachesService,
    private permissionsService: PermissionsService,
  ) {}

  async create(
    createSquadDto: CreateSquadDto,
    user: AuthenticatedUser,
  ): Promise<Squad> {
    const group = await this.groupsService.findOne(createSquadDto.groupId);

    if (
      !this.permissionsService.checkGroupAccess(user, createSquadDto.groupId)
    ) {
      throw new ForbiddenException('You do not have access to this group');
    }

    const createdBy = user.coachId
      ? await this.coachesService.findOne(user.coachId)
      : null;

    const squad = this.squadsRepository.create({
      name: createSquadDto.name,
      gameFormat: createSquadDto.gameFormat,
      group,
      createdBy,
    });

    const savedSquad = await this.squadsRepository.save(squad);

    if (createSquadDto.positions && createSquadDto.positions.length > 0) {
      const positions = await this.createPositions(
        savedSquad,
        createSquadDto.positions,
      );
      savedSquad.positions = positions;
    }

    this.logger.log(`Squad created: ${savedSquad.id} for group ${group.id}`);
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
      relations: [
        'group',
        'group.players',
        'createdBy',
        'positions',
        'positions.player',
      ],
    });

    if (!squad) {
      throw new NotFoundException(`Squad with ID ${id} not found`);
    }

    return squad;
  }

  async update(
    id: string,
    updateSquadDto: UpdateSquadDto,
    user: AuthenticatedUser,
  ): Promise<Squad> {
    const squad = await this.findOne(id);

    if (!this.permissionsService.checkGroupAccess(user, squad.group.id)) {
      throw new ForbiddenException('You do not have access to this squad');
    }

    if (updateSquadDto.name !== undefined) {
      squad.name = updateSquadDto.name;
    }

    if (updateSquadDto.gameFormat !== undefined) {
      squad.gameFormat = updateSquadDto.gameFormat;
    }

    const saved = await this.squadsRepository.save(squad);
    this.logger.log(`Squad updated: ${id}`);
    return saved;
  }

  async updatePositions(
    id: string,
    updatePositionsDto: UpdatePositionsDto,
    user: AuthenticatedUser,
  ): Promise<Squad> {
    const squad = await this.findOne(id);

    if (!this.permissionsService.checkGroupAccess(user, squad.group.id)) {
      throw new ForbiddenException('You do not have access to this squad');
    }

    await this.positionsRepository.delete({ squad: { id } });

    const positions = await this.createPositions(
      squad,
      updatePositionsDto.positions,
    );
    squad.positions = positions;

    this.logger.log(`Squad positions updated: ${id}`);
    return squad;
  }

  async duplicate(
    id: string,
    newName: string,
    user: AuthenticatedUser,
  ): Promise<Squad> {
    const original = await this.findOne(id);

    if (!this.permissionsService.checkGroupAccess(user, original.group.id)) {
      throw new ForbiddenException('You do not have access to this squad');
    }

    const newSquad = this.squadsRepository.create({
      name: newName,
      gameFormat: original.gameFormat,
      group: original.group,
      createdBy: original.createdBy,
    });

    const savedSquad = await this.squadsRepository.save(newSquad);

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

    this.logger.log(`Squad duplicated: ${id} -> ${savedSquad.id}`);
    return savedSquad;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const squad = await this.findOne(id);

    if (!this.permissionsService.checkGroupAccess(user, squad.group.id)) {
      throw new ForbiddenException('You do not have access to this squad');
    }

    await this.squadsRepository.remove(squad);
    this.logger.log(`Squad deleted: ${id}`);
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
    // Batch fetch all players
    const playerIds = positionsData
      .map((p) => p.playerId)
      .filter((id): id is string => !!id);

    const players =
      playerIds.length > 0
        ? await this.playersRepository.find({ where: { id: In(playerIds) } })
        : [];
    const playersMap = new Map(players.map((p) => [p.id, p]));

    // Create all positions
    const positions = positionsData.map((posData) => {
      return this.positionsRepository.create({
        squad,
        player: posData.playerId
          ? playersMap.get(posData.playerId) || null
          : null,
        role: posData.role as Position,
        isStarter: posData.isStarter,
        orderIndex: posData.orderIndex,
      });
    });

    // Batch save
    return await this.positionsRepository.save(positions);
  }
}
