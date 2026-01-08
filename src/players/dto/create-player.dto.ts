import {
  IsEmail,
  IsString,
  MinLength,
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
