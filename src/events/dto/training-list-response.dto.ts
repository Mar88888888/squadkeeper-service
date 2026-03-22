import { Expose, Type } from 'class-transformer';
import { TrainingResponseDto } from './training-response.dto';

export class TrainingListResponseDto {
  @Expose()
  @Type(() => TrainingResponseDto)
  items: TrainingResponseDto[];

  @Expose()
  total: number;
}

