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

function parseDate(dateString: string): Date | null {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
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
        const dayOfWeek = now.getDay();
        startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { startTime: Between(startOfWeek, endOfWeek) };
      }

      case TimeFilter.NEXT_WEEK: {
        const startOfNextWeek = new Date(now);
        const dayOfWeek = now.getDay();
        startOfNextWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? 1 : 8));
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
    const from = parseDate(dateFrom);
    const to = parseDate(dateTo);
    if (from && to) {
      return { startTime: Between(startOfDay(from), endOfDay(to)) };
    }
  }
  if (dateFrom) {
    const from = parseDate(dateFrom);
    if (from) {
      return { startTime: MoreThanOrEqual(startOfDay(from)) };
    }
  }
  if (dateTo) {
    const to = parseDate(dateTo);
    if (to) {
      return { startTime: LessThanOrEqual(endOfDay(to)) };
    }
  }

  return undefined;
}
