import { IsUUID, IsInt, IsString, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { EvaluationType } from '../enums/evaluation-type.enum';

export class CreateEvaluationDto {
  @IsUUID()
  playerId: string;

  @IsUUID()
  trainingId: string;

  @IsEnum(EvaluationType)
  type: EvaluationType;

  @IsInt()
  @Min(1)
  @Max(10)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
