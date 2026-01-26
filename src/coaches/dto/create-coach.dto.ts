import {
  IsEmail,
  IsString,
  IsStrongPassword,
  IsInt,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateCoachDto {
  @IsEmail()
  email: string;

  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 },
    { message: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
  )
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  licenseLevel: string;

  @IsInt()
  experienceYears: number;
}
