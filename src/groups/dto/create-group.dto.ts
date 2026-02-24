import { IsString, IsInt, IsOptional, IsUUID, IsArray } from 'class-validator';
import { IsValidYearOfBirth } from '../../common/validators/is-valid-year-of-birth.validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsInt()
  @IsValidYearOfBirth({ minAge: 3, maxAge: 25 })
  yearOfBirth: number;

  @IsOptional()
  @IsUUID()
  headCoachId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assistantIds?: string[];
}
