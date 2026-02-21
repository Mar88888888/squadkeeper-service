import { UserRole } from '../../users/enums/user-role.enum';

export interface ChildInfo {
  id: string;
  groupId?: string;
}

export class AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  groupIds: string[];
  playerId?: string;
  coachId?: string;
  children?: ChildInfo[];
}
