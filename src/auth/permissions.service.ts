import { Injectable } from '@nestjs/common';
import { UserRole } from '../users/enums/user-role.enum';
import { Group } from '../groups/entities/group.entity';
import { AuthenticatedUser } from './dto/authenticated-user.dto';

interface GroupOwned {
  group: Group;
}

@Injectable()
export class PermissionsService {
  checkEventAccess(user: AuthenticatedUser, event: GroupOwned): boolean {
    if (user.role === UserRole.ADMIN) return true;

    return user.groupIds?.includes(event.group.id) ?? false;
  }
}
