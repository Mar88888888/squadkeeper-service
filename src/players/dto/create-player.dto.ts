import {
  IsEmail,
  IsString,
  IsStrongPassword,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Position } from '../enums/position.enum';
import { StrongFoot } from '../enums/strong-foot.enum';

export class CreatePlayerDto {
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

  @IsEnum(Position)
  position: Position;

  @IsNumber()
  height: number;

  @IsNumber()
  weight: number;

  @IsEnum(StrongFoot)
  strongFoot: StrongFoot;
}
