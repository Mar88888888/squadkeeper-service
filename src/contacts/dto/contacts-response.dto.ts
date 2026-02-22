import { UserRole } from '../../users/enums/user-role.enum';

export interface GroupInfo {
  id: string;
  name: string;
}

export interface ContactInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  groups?: GroupInfo[];
}

export interface ContactsResponse {
  coaches: ContactInfo[];
  admins: ContactInfo[];
  myCoachIds: string[];
}
