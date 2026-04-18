import { Position } from '../enums/position.enum';
import { StatsPeriod } from '../../common/enums/stats-period.enum';

export type TeamOfMonthLine = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface TeamOfMonthPlayerMetrics {
  averageRating: number;
  technical: number;
  tactical: number;
  physical: number;
  psychological: number;
  matchesPlayed: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  goalsPerMatch: number;
  assistsPerMatch: number;
  cleanSheetsPerMatch: number;
  attendanceRate: number;
  totalEvents: number;
}

export interface TeamOfMonthPlayer {
  playerId: string;
  playerName: string;
  position: Position;
  line: TeamOfMonthLine;
  topsisScore: number;
  eligibleByEventsThreshold: boolean;
  metrics: TeamOfMonthPlayerMetrics;
}

export interface TeamOfMonthResponse {
  formation: '4-3-3';
  period: StatsPeriod.THIS_MONTH;
  month: string;
  groupIds: string[];
  groupTotalEvents: number;
  minRequiredEvents: number;
  players: {
    goalkeeper: TeamOfMonthPlayer | null;
    defenders: TeamOfMonthPlayer[];
    midfielders: TeamOfMonthPlayer[];
    forwards: TeamOfMonthPlayer[];
  };
}
