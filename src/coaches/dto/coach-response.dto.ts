import { LicenseLevel } from './create-coach.dto';

export interface CoachResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  licenseLevel: LicenseLevel;
  experienceYears: number;
}
