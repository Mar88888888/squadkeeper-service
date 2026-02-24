import { IsString, IsInt, IsOptional } from 'class-validator';
import { IsValidYearOfBirth } from '../validators/is-valid-year-of-birth.validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @IsValidYearOfBirth({ minAge: 3, maxAge: 25 })
  yearOfBirth?: number;
}
