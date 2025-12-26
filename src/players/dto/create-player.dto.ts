import {
  IsEmail,
  IsString,
  MinLength,
  IsDateString,
  IsNumber,
  IsOptional,
} from 'class-validator';

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

  @IsString()
  position: string;

  @IsNumber()
  height: number;

  @IsNumber()
  weight: number;

  @IsString()
  strongFoot: string;
}
