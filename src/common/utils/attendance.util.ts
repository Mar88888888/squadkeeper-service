/**
 * Interface for attendance statistics used in rate calculation
 */
export interface AttendanceStatsForRate {
  total: number;
  present: number;
  rate: number;
}

/**
 * Calculates the attendance rate based on attendance statistics.
 * Rate = (present / total) * 100, rounded to nearest integer
 *
 * @param stats - Object containing total, present counts and a rate field to update
 */
export function calculateAttendanceRate<T extends AttendanceStatsForRate>(
  stats: T,
): void {
  if (stats.total > 0) {
    stats.rate = Math.round((stats.present / stats.total) * 100);
  }
}
