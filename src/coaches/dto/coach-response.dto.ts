import { Expose, Transform } from 'class-transformer';
import { LicenseLevel } from './create-coach.dto';

export class CoachResponseDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  @Transform(({ obj }) => obj.user?.email ?? '')
  email: string;

  @Expose()
  phoneNumber: string | null;

  @Expose()
  @Transform(({ obj }) => obj.dateOfBirth?.toISOString().split('T')[0] ?? null)
  dateOfBirth: string | null;

  @Expose()
  licenseLevel: LicenseLevel;

  @Expose()
  experienceYears: number;
}
