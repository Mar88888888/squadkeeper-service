import { Type } from 'class-transformer';
import {
  IsArray,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
  IsInt,
  IsString,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { EvaluationType } from '../enums/evaluation-type.enum';

export class EvaluationRecordDto {
  @IsUUID()
  playerId: string;

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

export class CreateEvaluationBatchDto {
  @IsUUID()
  trainingId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EvaluationRecordDto)
  records: EvaluationRecordDto[];
}
