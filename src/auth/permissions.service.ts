import { Injectable } from '@nestjs/common';
import { UserRole } from '../users/enums/user-role.enum';
import { Training } from '../events/entities/training.entity';
import { AuthenticatedUser } from './dto/authenticated-user.dto';

@Injectable()
export class PermissionsService {
  checkTrainingAccess(user: AuthenticatedUser, training: Training): boolean {
    if (user.role === UserRole.ADMIN) return true;

    return user.groupIds?.includes(training.group.id);
  }
}
