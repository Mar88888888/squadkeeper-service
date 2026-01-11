import { Between, FindOperator, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { TimeFilter } from '../enums/time-filter.enum';

interface DateFilterOptions {
  timeFilter?: TimeFilter;
  dateFrom?: string;
  dateTo?: string;
}

interface StartTimeFilter {
  startTime: FindOperator<Date>;
}

export function buildDateFilter(filters: DateFilterOptions): StartTimeFilter | undefined {
  const { timeFilter, dateFrom, dateTo } = filters;

  if (timeFilter && timeFilter !== TimeFilter.ALL) {
    const now = new Date();

    switch (timeFilter) {
      case TimeFilter.UPCOMING:
        return { startTime: MoreThanOrEqual(now) };

      case TimeFilter.PAST:
        return { startTime: LessThanOrEqual(now) };

      case TimeFilter.THIS_WEEK: {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { startTime: Between(startOfWeek, endOfWeek) };
      }

      case TimeFilter.NEXT_WEEK: {
        const startOfNextWeek = new Date(now);
        startOfNextWeek.setDate(now.getDate() - now.getDay() + 8);
        startOfNextWeek.setHours(0, 0, 0, 0);
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
        endOfNextWeek.setHours(23, 59, 59, 999);
        return { startTime: Between(startOfNextWeek, endOfNextWeek) };
      }

      case TimeFilter.THIS_MONTH: {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
        return { startTime: Between(startOfMonth, endOfMonth) };
      }
    }
  }

  if (dateFrom && dateTo) {
    return {
      startTime: Between(
        new Date(dateFrom),
        new Date(dateTo + 'T23:59:59.999Z'),
      ),
    };
  }
  if (dateFrom) {
    return { startTime: MoreThanOrEqual(new Date(dateFrom)) };
  }
  if (dateTo) {
    return {
      startTime: LessThanOrEqual(new Date(dateTo + 'T23:59:59.999Z')),
    };
  }

  return undefined;
}
