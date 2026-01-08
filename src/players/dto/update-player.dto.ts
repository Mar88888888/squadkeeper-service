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

export class UpdatePlayerDto {
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
  @IsEnum(Position)
  position?: Position;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsEnum(StrongFoot)
  strongFoot?: StrongFoot;
}
