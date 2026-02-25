import {
  IsEmail,
  IsStrongPassword,
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateParentDto {
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

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  childrenIds?: string[];
}
