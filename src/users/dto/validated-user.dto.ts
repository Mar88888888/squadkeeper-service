import { Expose } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';

export class ValidatedUserDto {
  @Expose()
  id: string;
  @Expose()
  email: string;
  @Expose()
  role: UserRole;
  @Expose()
  firstName: string;
  @Expose()
  lastName: string;
}
