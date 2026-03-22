import { Expose, Type } from 'class-transformer';

class TrainingGroupPlayerDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;
}

class TrainingGroupDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  @Type(() => TrainingGroupPlayerDto)
  players: TrainingGroupPlayerDto[];
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
