import {
  IsEmail,
  IsString,
  IsStrongPassword,
  IsInt,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
  Max,
  Min,
  IsEnum,
} from 'class-validator';

export enum LicenseLevel {
  NONE = 'none',
  GRASSROOTS = 'grassroots',
  UEFA_C = 'uefa_c',
  UEFA_B = 'uefa_b',
  UEFA_A = 'uefa_a',
  UEFA_PRO = 'uefa_pro',
}

export class CreateCoachDto {
  @IsEmail()
  email: string;

  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    },
    {
      message:
        'Password must be at least 8 characters with uppercase, lowercase, and number',
    },
  )
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(LicenseLevel, {
    message: `licenseLevel must be one of: ${Object.values(LicenseLevel).join(', ')}`,
  })
  licenseLevel: LicenseLevel;

  @IsInt()
  @Min(0)
  @Max(100)
  experienceYears: number;
}
