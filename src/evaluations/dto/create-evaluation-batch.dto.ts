import { Type } from 'class-transformer';
import {
  IsArray,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
  IsInt,
  IsString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class EvaluationRecordDto {
  @IsUUID()
  playerId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  technical?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  tactical?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  physical?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  psychological?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateEvaluationBatchDto {
  @IsOptional()
  @IsUUID()
  trainingId?: string;

  @IsOptional()
  @IsUUID()
  matchId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EvaluationRecordDto)
  records: EvaluationRecordDto[];
}
