import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ObjectiveMetric } from '../enums/objective-metric.enum';

export class CreateObjectiveDto {
  @IsUUID()
  playerId: string;

  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(ObjectiveMetric)
  metric: ObjectiveMetric;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  targetValue: number;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  badgeLabel?: string;
}
