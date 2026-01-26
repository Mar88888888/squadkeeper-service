import {
  IsEmail,
  IsString,
  IsStrongPassword,
  IsInt,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class UpdateCoachDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 },
    { message: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
  )
  password?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  licenseLevel?: string;

  @IsOptional()
  @IsInt()
  experienceYears?: number;
}
