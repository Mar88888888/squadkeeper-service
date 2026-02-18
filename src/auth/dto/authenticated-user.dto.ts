import { UserRole } from '../../users/enums/user-role.enum';

export class AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  groupIds: string[];
}
