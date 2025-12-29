import {
  IsDate,
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MatchType } from '../enums/match-type.enum';

export class CreateMatchDto {
  @IsString()
  groupId: string;

  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  endTime: Date;

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
