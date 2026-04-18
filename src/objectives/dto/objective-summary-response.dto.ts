import { Expose, Type } from 'class-transformer';

class RecentAchievementDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  badgeLabel: string | null;

  @Expose()
  achievedAt: Date;
}

export class ObjectiveSummaryResponseDto {
  @Expose()
  activeCount: number;

  @Expose()
  achievedCount: number;

  @Expose()
  expiredCount: number;

  @Expose()
  @Type(() => RecentAchievementDto)
  recentAchievements: RecentAchievementDto[];
}
