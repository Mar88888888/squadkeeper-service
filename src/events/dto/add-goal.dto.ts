import { IsString, IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';

export class AddGoalDto {
  @IsString()
  scorerId: string;

  @IsOptional()
  @IsString()
  assistId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  minute?: number;

  @IsOptional()
  @IsBoolean()
  isOwnGoal?: boolean;
}
