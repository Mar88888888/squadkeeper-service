import {
  IsDate,
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MatchType } from '../enums/match-type.enum';

export class CreateMatchDto {
  @IsString()
  groupId: string;

  @IsDate()
  @Type(() => Date)
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
