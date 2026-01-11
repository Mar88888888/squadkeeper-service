import { Position } from '../../players/enums/position.enum';
import { StatsPeriod } from '../../common/enums/stats-period.enum';

export interface PerformanceScoreComponents {
  skill: number;
  offense: number;
  defense: number;
  team: number;
}

export interface PerformanceWeights {
  skillWeight: number;
  offenseWeight: number;
  defenseWeight: number;
  teamWeight: number;
}

export interface RawPerformanceStats {
  matchesPlayed: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  evaluationCount: number;
  averageEvaluationRating: number | null;
  byCategory: {
    technical: number | null;
    tactical: number | null;
    physical: number | null;
    psychological: number | null;
  };
}

export interface PerformanceScoreResponse {
  playerId: string;
  playerName: string;
  position: Position;
  performanceScore: number;
  components: PerformanceScoreComponents;
  weights: PerformanceWeights;
  rawStats: RawPerformanceStats;
  period: StatsPeriod;
}

export interface TeamPerformanceScoreResponse {
  groupId: string;
  groupName: string;
  players: PerformanceScoreResponse[];
  period: StatsPeriod;
}
