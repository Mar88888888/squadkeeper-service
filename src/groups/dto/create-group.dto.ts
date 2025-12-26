import { IsString, IsInt, IsOptional, IsUUID, IsArray } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsInt()
  yearOfBirth: number;

  @IsOptional()
  @IsUUID()
  headCoachId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assistantIds?: string[];
}
