import { StatsPeriod } from '../enums/stats-period.enum';

export interface DateRange {
  start?: Date;
  end?: Date;
}

export function getDateRangeForPeriod(period: StatsPeriod): DateRange {
  const now = new Date();

  switch (period) {
    case StatsPeriod.THIS_MONTH: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return { start, end };
    }

    case StatsPeriod.THIS_SEASON: {
      const seasonStartMonth = 6;
      const seasonStartDay = 15;

      let seasonStartYear = now.getFullYear();
      if (
        now.getMonth() < seasonStartMonth ||
        (now.getMonth() === seasonStartMonth && now.getDate() < seasonStartDay)
      ) {
        seasonStartYear--;
      }

      const start = new Date(seasonStartYear, seasonStartMonth, seasonStartDay);
      const end = new Date(
        seasonStartYear + 1,
        seasonStartMonth,
        seasonStartDay - 1,
        23,
        59,
        59,
        999,
      );
      return { start, end };
    }

    case StatsPeriod.THIS_YEAR: {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    }

    case StatsPeriod.ALL_TIME:
    default:
      return {};
  }
}
