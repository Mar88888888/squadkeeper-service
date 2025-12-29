import { IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum MatchTimeFilter {
  ALL = 'all',
  UPCOMING = 'upcoming',
  PAST = 'past',
  THIS_WEEK = 'this_week',
  NEXT_WEEK = 'next_week',
  THIS_MONTH = 'this_month',
}

export class FilterMatchesDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(MatchTimeFilter)
  timeFilter?: MatchTimeFilter;
}
