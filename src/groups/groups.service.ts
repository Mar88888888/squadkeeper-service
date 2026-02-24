import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Group } from './entities/group.entity';
import { Player } from '../players/entities/player.entity';
import { CoachesService } from '../coaches/coaches.service';
import { PlayersService } from '../players/players.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateGroupStaffDto } from './dto/update-group-staff.dto';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    private coachesService: CoachesService,
    private playersService: PlayersService,
    private dataSource: DataSource,
  ) {}

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    const group = this.groupsRepository.create(createGroupDto);

    if (createGroupDto.headCoachId) {
      group.headCoach = await this.coachesService.findOne(
        createGroupDto.headCoachId,
      );
    }

    if (createGroupDto.assistantIds && createGroupDto.assistantIds.length > 0) {
      group.assistants = await this.coachesService.findByIds(
        createGroupDto.assistantIds,
      );
    }

    return await this.groupsRepository.save(group);
  }

  async findAll(): Promise<Group[]> {
    return await this.groupsRepository.find({
      relations: ['headCoach', 'assistants', 'players'],
    });
  }

  async findMyGroups(groupIds: string[]): Promise<Group[]> {
    if (groupIds.length === 0) {
      return [];
    }

    return await this.groupsRepository.find({
      where: { id: In(groupIds) },
      relations: ['headCoach', 'assistants', 'players'],
    });
  }

  async findOne(id: string): Promise<Group> {
    const group = await this.groupsRepository.findOne({
      where: { id },
      relations: ['headCoach', 'assistants', 'players'],
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return group;
  }

  async update(id: string, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const group = await this.findOne(id);

    if (updateGroupDto.name !== undefined) {
      group.name = updateGroupDto.name;
    }

    if (updateGroupDto.yearOfBirth !== undefined) {
      group.yearOfBirth = updateGroupDto.yearOfBirth;
    }

    return await this.groupsRepository.save(group);
  }

  async updateStaff(
    id: string,
    updateGroupStaffDto: UpdateGroupStaffDto,
  ): Promise<Group> {
    const group = await this.findOne(id);

    if (updateGroupStaffDto.headCoachId !== undefined) {
      if (updateGroupStaffDto.headCoachId === null) {
        group.headCoach = null;
      } else {
        group.headCoach = await this.coachesService.findOne(
          updateGroupStaffDto.headCoachId,
        );
      }
    }

    if (updateGroupStaffDto.assistantIds !== undefined) {
      if (updateGroupStaffDto.assistantIds.length === 0) {
        group.assistants = [];
      } else {
        group.assistants = await this.coachesService.findByIds(
          updateGroupStaffDto.assistantIds,
        );
      }
    }

    return await this.groupsRepository.save(group);
  }

  async addPlayers(groupId: string, playerIds: string[]): Promise<Group> {
    await this.findOne(groupId);
    await this.playersService.assignToGroup(playerIds, groupId);
    return await this.findOne(groupId);
  }

  async removePlayers(groupId: string, playerIds: string[]): Promise<Group> {
    await this.findOne(groupId);
    await this.playersService.removeFromGroup(playerIds, groupId);
    return await this.findOne(groupId);
  }

  async remove(id: string): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const group = await manager.findOne(Group, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!group) {
          return;
        }

        await manager
          .createQueryBuilder()
          .update(Player)
          .set({ group: null })
          .where('groupId = :groupId', { groupId: id })
          .execute();

        await manager.remove(group);
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to delete group ${id}`, error);
      throw new InternalServerErrorException(`Failed to delete group: ${error.message}`);
    }
  }
}
