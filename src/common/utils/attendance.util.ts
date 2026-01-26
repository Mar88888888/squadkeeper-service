/**
 * Interface for attendance statistics used in rate calculation
 */
export interface AttendanceStatsForRate {
  total: number;
  present: number;
  late: number;
  benched: number;
  rate: number;
}

/**
 * Calculates the attendance rate based on attendance statistics.
 * Attended = PRESENT + LATE + BENCHED (benched counts as attended)
 * Rate = (attended / total) * 100, rounded to nearest integer
 *
 * @param stats - Object containing total, present, late, benched counts and a rate field to update
 */
export function calculateAttendanceRate<T extends AttendanceStatsForRate>(
  stats: T,
): void {
  const attended = stats.present + stats.late + stats.benched;
  if (stats.total > 0) {
    stats.rate = Math.round((attended / stats.total) * 100);
  }
}
