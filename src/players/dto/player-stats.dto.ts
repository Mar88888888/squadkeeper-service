import { Position } from '../enums/position.enum';
import { StatsPeriod } from '../../common/enums/stats-period.enum';

export interface AttendanceBreakdown {
  total: number;
  present: number;
  late: number;
  benched: number;
  absent: number;
  sick: number;
  rate: number;
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
  groupId: string | null;
  stats: PlayerStatsResponse | null;
}

export interface ChildrenStatsResponse {
  children: ChildInfo[];
}
