import { IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum TrainingTimeFilter {
  ALL = 'all',
  UPCOMING = 'upcoming',
  PAST = 'past',
  THIS_WEEK = 'this_week',
  NEXT_WEEK = 'next_week',
  THIS_MONTH = 'this_month',
}

export class FilterTrainingsDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(TrainingTimeFilter)
  timeFilter?: TrainingTimeFilter;
}
