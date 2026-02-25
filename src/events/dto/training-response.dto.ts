import { Expose, Type } from 'class-transformer';

class TrainingGroupDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

export class TrainingResponseDto {
  @Expose()
  id: string;

  @Expose()
  startTime: Date;

  @Expose()
  durationMinutes: number;

  @Expose()
  location: string;

  @Expose()
  topic: string | null;

  @Expose()
  @Type(() => TrainingGroupDto)
  group: TrainingGroupDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
