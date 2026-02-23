import { Expose, Transform, Type } from 'class-transformer';
import { LicenseLevel } from './create-coach.dto';

class UserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;
}

export class CoachResponseDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;

  @Expose()
  phoneNumber: string | null;

  @Expose()
  @Transform(({ obj }) => {
    if (!obj.dateOfBirth) return null;
    if (obj.dateOfBirth instanceof Date) {
      return obj.dateOfBirth.toISOString().split('T')[0];
    }
    return String(obj.dateOfBirth).split('T')[0];
  })
  dateOfBirth: string | null;

  @Expose()
  licenseLevel: LicenseLevel;

  @Expose()
  experienceYears: number;
}
