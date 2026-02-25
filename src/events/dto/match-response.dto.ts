import { Expose, Type } from 'class-transformer';
import { MatchType } from '../enums/match-type.enum';

class MatchGroupDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

export class MatchResponseDto {
  @Expose()
  id: string;

  @Expose()
  startTime: Date;

  @Expose()
  durationMinutes: number;

  @Expose()
  location: string;

  @Expose()
  opponent: string;

  @Expose()
  isHome: boolean;

  @Expose()
  matchType: MatchType;

  @Expose()
  homeGoals: number | null;

  @Expose()
  awayGoals: number | null;

  @Expose()
  @Type(() => MatchGroupDto)
  group: MatchGroupDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
