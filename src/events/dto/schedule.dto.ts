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
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday)

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @IsString()
  @IsNotEmpty()
  location: string;
}

export class UpdateScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  items: ScheduleItemDto[];
}

export class GenerateTrainingsDto {
  @IsDateString()
  fromDate: string; // "YYYY-MM-DD"

  @IsDateString()
  toDate: string; // "YYYY-MM-DD"

  @IsOptional()
  @IsString()
  defaultTopic?: string;
}
