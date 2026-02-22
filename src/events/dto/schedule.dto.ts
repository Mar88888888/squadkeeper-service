import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsDateString,
  Min,
  Max,
  Matches,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'startTime must be in HH:mm or HH:mm:ss format',
  })
  startTime: string;

  @IsInt()
  @Min(15, { message: 'Duration must be at least 15 minutes' })
  @Max(180, { message: 'Duration cannot exceed 180 minutes (3 hours)' })
  durationMinutes: number;

  @IsString()
  @IsNotEmpty()
  location: string;
}

export class ApplyScheduleDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one schedule day is required' })
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  items: ScheduleItemDto[];

  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;

  @IsOptional()
  @IsString()
  defaultTopic?: string;
}
