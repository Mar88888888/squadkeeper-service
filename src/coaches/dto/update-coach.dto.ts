import {
  IsEmail,
  IsString,
  MinLength,
  IsInt,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class UpdateCoachDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
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
