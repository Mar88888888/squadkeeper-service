import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Group } from './entities/group.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Player } from '../players/entities/player.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateGroupStaffDto } from './dto/update-group-staff.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
  ) {}

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    const group = this.groupsRepository.create(createGroupDto);

    // Handle head coach assignment
    if (createGroupDto.headCoachId) {
      const headCoach = await this.coachesRepository.findOne({
        where: { id: createGroupDto.headCoachId },
      });
      if (!headCoach) {
        throw new NotFoundException(
          `Coach with ID ${createGroupDto.headCoachId} not found`,
        );
      }
      group.headCoach = headCoach;
    }

    if (createGroupDto.assistantIds && createGroupDto.assistantIds.length > 0) {
      const assistants = await this.coachesRepository.find({
        where: { id: In(createGroupDto.assistantIds) },
      });

      if (assistants.length !== createGroupDto.assistantIds.length) {
        const foundIds = assistants.map((coach) => coach.id);
        const missingIds = createGroupDto.assistantIds.filter(
          (id) => !foundIds.includes(id),
        );
        throw new NotFoundException(
          `Coaches with IDs ${missingIds.join(', ')} not found`,
        );
      }

      group.assistants = assistants;
    }

    return await this.groupsRepository.save(group);
  }

  async findAll(): Promise<Group[]> {
    return await this.groupsRepository.find({
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
        const headCoach = await this.coachesRepository.findOne({
          where: { id: updateGroupStaffDto.headCoachId },
        });
        if (!headCoach) {
          throw new NotFoundException(
            `Coach with ID ${updateGroupStaffDto.headCoachId} not found`,
          );
        }
        group.headCoach = headCoach;
      }
    }

    if (updateGroupStaffDto.assistantIds !== undefined) {
      if (updateGroupStaffDto.assistantIds.length === 0) {
        group.assistants = [];
      } else {
        const assistants = await this.coachesRepository.find({
          where: { id: In(updateGroupStaffDto.assistantIds) },
        });

        if (assistants.length !== updateGroupStaffDto.assistantIds.length) {
          const foundIds = assistants.map((coach) => coach.id);
          const missingIds = updateGroupStaffDto.assistantIds.filter(
            (id) => !foundIds.includes(id),
          );
          throw new NotFoundException(
            `Coaches with IDs ${missingIds.join(', ')} not found`,
          );
        }

        group.assistants = assistants;
      }
    }

    return await this.groupsRepository.save(group);
  }

  async addPlayers(groupId: string, playerIds: string[]): Promise<Group> {
    // Check if group exists
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    // Check if all players exist
    const players = await this.playersRepository.find({
      where: { id: In(playerIds) },
    });

    if (players.length !== playerIds.length) {
      const foundIds = players.map((player) => player.id);
      const missingIds = playerIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Players with IDs ${missingIds.join(', ')} not found`,
      );
    }

    // Update players directly for better performance
    await this.playersRepository.update(
      { id: In(playerIds) },
      { group: { id: groupId } },
    );

    // Return the updated group with relations
    const updatedGroup = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['headCoach', 'assistants', 'players'],
    });

    if (!updatedGroup) {
      // This should not happen since we just verified the group exists
      throw new NotFoundException(
        `Group with ID ${groupId} not found after update`,
      );
    }

    return updatedGroup;
  }

  async removePlayers(groupId: string, playerIds: string[]): Promise<Group> {
    const group = await this.findOne(groupId);

    // Update players to remove them from the group
    await this.playersRepository
      .createQueryBuilder()
      .update(Player)
      .set({ group: null as unknown as Group })
      .where('id IN (:...playerIds)', { playerIds })
      .andWhere('groupId = :groupId', { groupId })
      .execute();

    // Return the updated group with relations
    return await this.findOne(groupId);
  }

  async remove(id: string): Promise<void> {
    // First unassign all players from this group
    await this.playersRepository
      .createQueryBuilder()
      .update(Player)
      .set({ group: null as unknown as Group })
      .where('groupId = :groupId', { groupId: id })
      .execute();

    const result = await this.groupsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
  }
}
