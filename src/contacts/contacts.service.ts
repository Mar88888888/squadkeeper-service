import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Coach } from '../coaches/entities/coach.entity';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { ContactInfo, ContactsResponse } from './dto/contacts-response.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
  ) {}

  async getContacts(groupIds: string[]): Promise<ContactsResponse> {
    const coaches = await this.coachesRepository.find({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        user: { email: true },
        headGroups: { id: true, name: true },
        assistantGroups: { id: true, name: true },
      },
      relations: ['user', 'headGroups', 'assistantGroups'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    const admins = await this.usersRepository.find({
      where: { role: UserRole.ADMIN },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    const myCoachIds = await this.getMyCoachIds(groupIds);

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

  private async getMyCoachIds(groupIds: string[]): Promise<string[]> {
    if (groupIds.length === 0) {
      return [];
    }

    const groups = await this.groupsRepository.find({
      where: { id: In(groupIds) },
      relations: ['headCoach', 'assistants'],
      select: {
        id: true,
        headCoach: { id: true },
        assistants: { id: true },
      },
    });

    const coachIds = new Set<string>();
    groups.forEach((group) => {
      if (group.headCoach) {
        coachIds.add(group.headCoach.id);
      }
      group.assistants?.forEach((assistant) => {
        coachIds.add(assistant.id);
      });
    });

    return Array.from(coachIds);
  }
}
