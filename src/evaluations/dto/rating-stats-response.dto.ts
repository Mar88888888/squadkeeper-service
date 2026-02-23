import { Expose, Type } from 'class-transformer';
import { EventType } from '../../events/enums/event-type.enum';

class RatingsDto {
  @Expose()
  technical: number | null;

  @Expose()
  tactical: number | null;

  @Expose()
  physical: number | null;

  @Expose()
  psychological: number | null;
}

class RatingHistoryPointDto {
  @Expose()
  date: string;

  @Expose()
  eventType: EventType;

  @Expose()
  eventId: string;

  @Expose()
  averageRating: number;

  @Expose()
  @Type(() => RatingsDto)
  ratings: RatingsDto;
}

class CategoryRatingsDto {
  @Expose()
  technical: number | null;

  @Expose()
  tactical: number | null;

  @Expose()
  physical: number | null;

  @Expose()
  psychological: number | null;
}

export class RatingStatsResponseDto {
  @Expose()
  averageRating: number | null;

  @Expose()
  totalEvents: number;

  @Expose()
  @Type(() => CategoryRatingsDto)
  byCategory: CategoryRatingsDto;

  @Expose()
  @Type(() => RatingHistoryPointDto)
  history: RatingHistoryPointDto[];
}
