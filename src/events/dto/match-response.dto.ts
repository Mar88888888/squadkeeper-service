import { Expose, Type } from 'class-transformer';
import { MatchType } from '../enums/match-type.enum';

class MatchGroupPlayerDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;
}

class MatchGroupDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  @Type(() => MatchGroupPlayerDto)
  players: MatchGroupPlayerDto[];
}

class GoalPlayerDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;
}

class GoalDto {
  @Expose()
  id: string;

  @Expose()
  @Type(() => GoalPlayerDto)
  scorer: GoalPlayerDto;

  @Expose()
  @Type(() => GoalPlayerDto)
  assist: GoalPlayerDto | null;

  @Expose()
  minute: number | null;

  @Expose()
  isOwnGoal: boolean;
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
  @Type(() => GoalDto)
  goals: GoalDto[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
