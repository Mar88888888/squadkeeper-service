import { Expose, Type } from 'class-transformer';

class GoalPlayerDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;
}

export class GoalResponseDto {
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

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
