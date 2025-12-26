import { IsOptional, IsUUID, IsArray } from 'class-validator';

export class UpdateGroupStaffDto {
  @IsOptional()
  @IsUUID()
  headCoachId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assistantIds?: string[];
}
