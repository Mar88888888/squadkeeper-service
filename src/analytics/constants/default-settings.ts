import { Position } from '../../players/enums/position.enum';
import { PositionExpectations } from '../entities/performance-settings.entity';

export const DEFAULT_WEIGHTS = {
  skillWeight: 35,
  offenseWeight: 35,
  defenseWeight: 15,
  teamWeight: 15,
} as const;

export const DEFAULT_POSITION_EXPECTATIONS: PositionExpectations = {
  [Position.ST]: { expectedGoalsPerMatch: 0.6, expectedAssistsPerMatch: 0.3 },
  [Position.CAM]: { expectedGoalsPerMatch: 0.4, expectedAssistsPerMatch: 0.5 },
  [Position.LW]: { expectedGoalsPerMatch: 0.5, expectedAssistsPerMatch: 0.4 },
  [Position.RW]: { expectedGoalsPerMatch: 0.5, expectedAssistsPerMatch: 0.4 },
  [Position.CM]: { expectedGoalsPerMatch: 0.2, expectedAssistsPerMatch: 0.3 },
  [Position.CDM]: { expectedGoalsPerMatch: 0.1, expectedAssistsPerMatch: 0.2 },
  [Position.CB]: { expectedGoalsPerMatch: 0.05, expectedAssistsPerMatch: 0.1 },
  [Position.LB]: { expectedGoalsPerMatch: 0.1, expectedAssistsPerMatch: 0.2 },
  [Position.RB]: { expectedGoalsPerMatch: 0.1, expectedAssistsPerMatch: 0.2 },
  [Position.GK]: { expectedGoalsPerMatch: 0.01, expectedAssistsPerMatch: 0.02 },
};
