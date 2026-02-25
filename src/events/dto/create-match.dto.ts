import {
  IsDate,
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsInt,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MatchType } from '../enums/match-type.enum';
import { IsFutureDate } from '../validators/is-future-date.validator';

export class CreateMatchDto {
  @IsUUID()
  groupId: string;

  @IsDate()
  @Type(() => Date)
  @IsFutureDate({ message: 'Match cannot be scheduled in the past' })
  startTime: Date;

  @Type(() => Number)
  @IsInt()
  @Min(45, { message: 'Duration must be at least 45 minutes' })
  @Max(150, { message: 'Duration cannot exceed 150 minutes' })
  durationMinutes: number;

  @IsString()
  location: string;

  @IsString()
  opponent: string;

  @IsBoolean()
  isHome: boolean;

  @IsOptional()
  @IsEnum(MatchType)
  matchType?: MatchType;
}
