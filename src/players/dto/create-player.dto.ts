import {
  IsEmail,
  IsString,
  IsStrongPassword,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Position } from '../enums/position.enum';
import { StrongFoot } from '../enums/strong-foot.enum';
import { IsDateOfBirth } from '../../common/validators/is-date-of-birth.validator';

export class CreatePlayerDto {
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
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsDateString()
  @IsDateOfBirth({ minAge: 3, maxAge: 100 })
  dateOfBirth: string;

  @IsEnum(Position)
  position: Position;

  @IsNumber()
  @Min(100, { message: 'Height must be at least 100 cm' })
  @Max(240, { message: 'Height cannot exceed 240 cm' })
  height: number;

  @IsNumber()
  @Min(20, { message: 'Weight must be at least 20 kg' })
  @Max(180, { message: 'Weight cannot exceed 180 kg' })
  weight: number;

  @IsEnum(StrongFoot)
  strongFoot: StrongFoot;
}
