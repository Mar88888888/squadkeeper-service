import {
  IsEmail,
  IsString,
  IsStrongPassword,
  IsOptional,
} from 'class-validator';

export class UpdateParentDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 },
    { message: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
  )
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
}
