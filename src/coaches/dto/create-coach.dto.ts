import {
  IsEmail,
  IsString,
  MinLength,
  IsInt,
  IsOptional,
} from 'class-validator';

export class CreateCoachDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsString()
  licenseLevel: string;

  @IsInt()
  experienceYears: number;
}
