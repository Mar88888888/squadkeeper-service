import { StatsPeriod } from '../enums/stats-period.enum';

export interface DateRange {
  start?: Date;
  end?: Date;
}

// Season start configuration (month is 0-indexed: 0=Jan, 7=Aug)
const SEASON_START_MONTH = parseInt(process.env.SEASON_START_MONTH ?? '7', 10);
const SEASON_START_DAY = parseInt(process.env.SEASON_START_DAY ?? '1', 10);

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
      let seasonStartYear = now.getFullYear();
      if (
        now.getMonth() < SEASON_START_MONTH ||
        (now.getMonth() === SEASON_START_MONTH && now.getDate() < SEASON_START_DAY)
      ) {
        seasonStartYear--;
      }

      const start = new Date(seasonStartYear, SEASON_START_MONTH, SEASON_START_DAY);
      const end = new Date(
        seasonStartYear + 1,
        SEASON_START_MONTH,
        SEASON_START_DAY - 1,
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
