import { Position } from '../enums/position.enum';

export enum StatsPeriod {
  ALL_TIME = 'all_time',
  THIS_SEASON = 'this_season',
  THIS_YEAR = 'this_year',
  THIS_MONTH = 'this_month',
}

export interface AttendanceBreakdown {
  total: number;
  present: number;
  late: number;
  benched: number;
  absent: number;
  sick: number;
  rate: number; // percentage
  totalTrainings: number;
  totalMatches: number;
}

export interface PlayerStatsResponse {
  playerId: string;
  playerName: string;
  position: Position;
  matchesPlayed: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  attendance: AttendanceBreakdown;
  period: StatsPeriod;
}

export interface TeamStatsResponse {
  groupId: string;
  groupName: string;
  players: PlayerStatsResponse[];
  period: StatsPeriod;
}

export interface ChildInfo {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ChildrenStatsResponse {
  children: ChildInfo[];
  stats: PlayerStatsResponse | null;
}
