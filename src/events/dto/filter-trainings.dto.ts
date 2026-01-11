import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { TimeFilter } from '../../common/enums/time-filter.enum';

export class FilterTrainingsDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(TimeFilter)
  timeFilter?: TimeFilter;
}
