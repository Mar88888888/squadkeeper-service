import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coach } from '../coaches/entities/coach.entity';
import { User } from '../users/entities/user.entity';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { UserRole } from '../users/enums/user-role.enum';

export interface ContactInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  groups?: { id: string; name: string }[];
}

export interface ContactsResponse {
  coaches: ContactInfo[];
  admins: ContactInfo[];
  myCoachIds: string[];
}

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(Parent)
    private parentsRepository: Repository<Parent>,
  ) {}

  async getContacts(userId: string, userRole: UserRole): Promise<ContactsResponse> {
    // Get all coaches with their groups
    const coaches = await this.coachesRepository.find({
      relations: ['user', 'headGroups', 'assistantGroups'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    // Get all admins
    const admins = await this.usersRepository.find({
      where: { role: UserRole.ADMIN },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    // Determine "my coaches" based on user role
    const myCoachIds = await this.getMyCoachIds(userId, userRole);

    const coachContacts: ContactInfo[] = coaches.map((coach) => ({
      id: coach.id,
      firstName: coach.firstName,
      lastName: coach.lastName,
      email: coach.user?.email || '',
      phoneNumber: coach.phoneNumber,
      role: UserRole.COACH,
      groups: [
        ...coach.headGroups.map((g) => ({ id: g.id, name: g.name })),
        ...coach.assistantGroups.map((g) => ({ id: g.id, name: g.name })),
      ],
    }));

    const adminContacts: ContactInfo[] = admins.map((admin) => ({
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      phoneNumber: null,
      role: UserRole.ADMIN,
    }));

    return {
      coaches: coachContacts,
      admins: adminContacts,
      myCoachIds,
    };
  }

  private async getMyCoachIds(userId: string, userRole: UserRole): Promise<string[]> {
    if (userRole === UserRole.PLAYER) {
      const player = await this.playersRepository
        .createQueryBuilder('player')
        .innerJoin('player.user', 'user')
        .leftJoinAndSelect('player.group', 'group')
        .leftJoinAndSelect('group.headCoach', 'headCoach')
        .leftJoinAndSelect('group.assistants', 'assistants')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!player?.group) {
        return [];
      }

      const coachIds: string[] = [];
      if (player.group.headCoach) {
        coachIds.push(player.group.headCoach.id);
      }
      player.group.assistants?.forEach((assistant) => {
        coachIds.push(assistant.id);
      });

      return coachIds;
    }

    if (userRole === UserRole.PARENT) {
      // Find parent's children and get coaches of their groups using QueryBuilder
      const parent = await this.parentsRepository
        .createQueryBuilder('parent')
        .innerJoin('parent.user', 'user')
        .leftJoinAndSelect('parent.children', 'children')
        .leftJoinAndSelect('children.group', 'group')
        .leftJoinAndSelect('group.headCoach', 'headCoach')
        .leftJoinAndSelect('group.assistants', 'assistants')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!parent?.children) {
        return [];
      }

      const coachIds = new Set<string>();
      parent.children.forEach((child) => {
        if (child.group?.headCoach) {
          coachIds.add(child.group.headCoach.id);
        }
        child.group?.assistants?.forEach((assistant) => {
          coachIds.add(assistant.id);
        });
      });

      return Array.from(coachIds);
    }

    // For coaches and admins, return empty (they see all)
    return [];
  }
}
