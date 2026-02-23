import { UserRole } from '../../users/enums/user-role.enum';
import { ChildInfo } from './authenticated-user.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  groupIds: string[];
  playerId?: string;
  coachId?: string;
  children?: ChildInfo[];
  iat?: number;
  exp?: number;
}
