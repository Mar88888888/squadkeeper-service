/**
 * Minimal interface for attendance rate calculation
 */
export interface AttendanceStatsForRate {
  total: number;
  present: number;
  rate: number;
}

/**
 * Full attendance statistics
 */
export interface AttendanceStats extends AttendanceStatsForRate {
  absent: number;
  totalTrainings: number;
  totalMatches: number;
}
