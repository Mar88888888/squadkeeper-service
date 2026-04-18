import { Expose, Type } from 'class-transformer';
import { ObjectiveMetric } from '../enums/objective-metric.enum';
import { ObjectiveScope } from '../enums/objective-scope.enum';
import { ObjectiveStatus } from '../enums/objective-status.enum';

class ObjectivePlayerDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  group: {
    id: string;
    name: string;
  } | null;
}

class ObjectiveGroupDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

export class ObjectiveResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string | null;

  @Expose()
  scope: ObjectiveScope;

  @Expose()
  metric: ObjectiveMetric;

  @Expose()
  targetValue: number;

  @Expose()
  periodStart: Date;

  @Expose()
  periodEnd: Date;

  @Expose()
  badgeLabel: string | null;

  @Expose()
  status: ObjectiveStatus;

  @Expose()
  currentValue: number;

  @Expose()
  progressPercent: number;

  @Expose()
  achievedAt: Date | null;

  @Expose()
  archivedAt: Date | null;

  @Expose()
  @Type(() => ObjectivePlayerDto)
  player: ObjectivePlayerDto | null;

  @Expose()
  @Type(() => ObjectiveGroupDto)
  group: ObjectiveGroupDto | null;

  @Expose()
  createdAt: Date;
}
