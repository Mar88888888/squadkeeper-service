import { IsString, IsInt, IsOptional, IsUUID, IsArray, Min, Max } from 'class-validator';

const currentYear = new Date().getFullYear();

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(currentYear - 25, { message: `Year of birth must be at least ${currentYear - 25}` })
  @Max(currentYear - 3, { message: `Year of birth must be at most ${currentYear - 3}` })
  yearOfBirth: number;

  @IsOptional()
  @IsUUID()
  headCoachId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assistantIds?: string[];
}
