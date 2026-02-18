import { IsDate, IsString, IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { IsFutureDate } from '../../common/validators/is-future-date.validator';

export class CreateTrainingDto {
  @IsUUID()
  groupId: string;

  @IsDate()
  @Type(() => Date)
  @IsFutureDate({ message: 'Training cannot be scheduled in the past' })
  startTime: Date;

  @Type(() => Number)
  @IsInt()
  @Min(15, { message: 'Duration must be at least 15 minutes' })
  @Max(180, { message: 'Duration cannot exceed 180 minutes (3 hours)' })
  durationMinutes: number;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  topic?: string;
}
