import { Expose } from 'class-transformer';

export class TrainingScheduleResponseDto {
  @Expose()
  id: string;

  @Expose()
  dayOfWeek: number;

  @Expose()
  startTime: string;

  @Expose()
  durationMinutes: number;

  @Expose()
  location: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
