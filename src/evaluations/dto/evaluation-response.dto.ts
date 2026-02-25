import { Expose, Type } from 'class-transformer';

class PlayerSummaryDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  position: string | null;
}

class CoachSummaryDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;
}

class EventSummaryDto {
  @Expose()
  id: string;

  @Expose()
  startTime: Date;
}

export class EvaluationResponseDto {
  @Expose()
  id: string;

  @Expose()
  technical: number | null;

  @Expose()
  tactical: number | null;

  @Expose()
  physical: number | null;

  @Expose()
  psychological: number | null;

  @Expose()
  comment: string | null;

  @Expose()
  @Type(() => PlayerSummaryDto)
  player: PlayerSummaryDto;

  @Expose()
  @Type(() => CoachSummaryDto)
  coach: CoachSummaryDto;

  @Expose()
  @Type(() => EventSummaryDto)
  training: EventSummaryDto | null;

  @Expose()
  @Type(() => EventSummaryDto)
  match: EventSummaryDto | null;

  @Expose()
  createdAt: Date;
}
