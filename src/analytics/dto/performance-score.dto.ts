import { Position } from '../../players/enums/position.enum';
import { StatsPeriod } from '../../players/dto/player-stats.dto';

export interface PerformanceScoreComponents {
  evaluationScore: number;        // 0-35 points
  goalContribution: number;       // Position-dependent (part of 50 pts)
  assistContribution: number;     // Position-dependent (part of 50 pts)
  cleanSheetContribution: number; // Position-dependent (part of 50 pts)
  winRateContribution: number;    // 0-10 points
  participationBonus: number;     // 0-5 points
}

// Position-based max points for goals, assists, clean sheets
// Total of these three always = 50 points
export interface PositionScoreWeights {
  goalMax: number;
  assistMax: number;
  cleanSheetMax: number;
}

export const POSITION_SCORE_WEIGHTS: Record<Position, PositionScoreWeights> = {
  // Attackers - goals and assists prioritized, minimal clean sheets
  [Position.ST]:  { goalMax: 30, assistMax: 18, cleanSheetMax: 2 },
  [Position.CAM]: { goalMax: 25, assistMax: 23, cleanSheetMax: 2 },
  [Position.LW]:  { goalMax: 28, assistMax: 20, cleanSheetMax: 2 },
  [Position.RW]:  { goalMax: 28, assistMax: 20, cleanSheetMax: 2 },

  // Midfielders - balanced, assists slightly more than goals
  [Position.CM]:  { goalMax: 18, assistMax: 22, cleanSheetMax: 10 },
  [Position.CDM]: { goalMax: 12, assistMax: 18, cleanSheetMax: 20 },

  // Defenders - clean sheets prioritized
  [Position.CB]:  { goalMax: 8,  assistMax: 12, cleanSheetMax: 30 },
  [Position.LB]:  { goalMax: 10, assistMax: 15, cleanSheetMax: 25 },
  [Position.RB]:  { goalMax: 10, assistMax: 15, cleanSheetMax: 25 },

  // Goalkeeper - clean sheets heavily prioritized
  [Position.GK]:  { goalMax: 2,  assistMax: 3,  cleanSheetMax: 45 },
};

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
  performanceScore: number; // 0-100 overall score
  components: PerformanceScoreComponents;
  maxWeights: PositionScoreWeights; // Position-specific max values
  rawStats: RawPerformanceStats;
  period: StatsPeriod;
}

export interface TeamPerformanceScoreResponse {
  groupId: string;
  groupName: string;
  players: PerformanceScoreResponse[];
  period: StatsPeriod;
}

// Position weights for goal scoring expectation
// Higher weight = lower goals expected for max score
export const GOAL_POSITION_WEIGHTS: Record<Position, number> = {
  [Position.ST]: 1.0,
  [Position.CAM]: 1.0,
  [Position.LW]: 1.0,
  [Position.RW]: 1.0,
  [Position.CM]: 0.7,
  [Position.CDM]: 0.5,
  [Position.CB]: 0.3,
  [Position.LB]: 0.4,
  [Position.RB]: 0.4,
  [Position.GK]: 0.1,
};

// Defensive positions eligible for clean sheet bonus
export const DEFENSIVE_POSITIONS: Position[] = [
  Position.GK,
  Position.CB,
  Position.LB,
  Position.RB,
  Position.CDM,
];
