import { Position } from '../../players/enums/position.enum';
import { StatsPeriod } from '../../common/enums/stats-period.enum';

export interface PlayerInfo {
  id: string;
  name: string;
  position: Position;
}

export interface PlayerCombinationStats {
  players: PlayerInfo[];
  matchesTogether: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  avgGoalDifference: number;
  averageEvaluationRating: number | null;
  chemistryScore: number;
}

export interface CorePlayer {
  id: string;
  name: string;
  position: Position;
  appearanceInWinningCombinations: number;
  averageChemistryScore: number;
}

export interface TeamChemistryResponse {
  groupId: string;
  groupName: string;
  period: StatsPeriod;
  minimumMatches: number;
  totalMatchesAnalyzed: number;
  bestPairs: PlayerCombinationStats[];
  bestTrios: PlayerCombinationStats[];
  corePlayers: CorePlayer[];
}
