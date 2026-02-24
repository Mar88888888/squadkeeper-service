import { Injectable } from '@nestjs/common';
import { UserRole } from '../users/enums/user-role.enum';
import { Group } from '../groups/entities/group.entity';
import { AuthenticatedUser } from './dto/authenticated-user.dto';

interface GroupOwned {
  group: Group;
}

@Injectable()
export class PermissionsService {
  checkGroupAccess(user: AuthenticatedUser, groupId: string): boolean {
    if (user.role === UserRole.ADMIN) return true;

    return user.groupIds?.includes(groupId) ?? false;
  }

  checkEventAccess(user: AuthenticatedUser, event: GroupOwned): boolean {
    return this.checkGroupAccess(user, event.group.id);
  }
}
