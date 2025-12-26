import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateParentDto {
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

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  childrenIds?: string[];
}
