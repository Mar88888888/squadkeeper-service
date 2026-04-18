import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { PlayerStatsService } from './player-stats.service';
import {
  TeamOfMonthPlayer,
  TeamOfMonthResponse,
} from './dto/team-of-month.dto';
import { StatsPeriod } from '../common/enums/stats-period.enum';
import { Position } from './enums/position.enum';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Match } from '../events/entities/match.entity';
import { Training } from '../events/entities/training.entity';
import { Group } from '../groups/entities/group.entity';
import { getDateRangeForPeriod } from '../common/utils/date-range.util';

type Line = 'GK' | 'DEF' | 'MID' | 'FWD';

interface CandidateMetrics {
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

interface Candidate {
  playerId: string;
  playerName: string;
  position: Position;
  line: Line;
  metrics: CandidateMetrics;
  eligibleByEventsThreshold: boolean;
}

interface WeightsByMetric {
  [metric: string]: number;
}

@Injectable()
export class TeamOfMonthService {
  private readonly formation = '4-3-3' as const;
  private readonly minAttendanceEvents = 5;

  private readonly lineSlots: Record<Line, number> = {
    GK: 1,
    DEF: 4,
    MID: 3,
    FWD: 3,
  };

  private readonly weights: Record<Line, WeightsByMetric> = {
    GK: {
      cleanSheetsPerMatch: 0.35,
      tactical: 0.25,
      psychological: 0.2,
      averageRating: 0.1,
      attendanceRate: 0.1,
    },
    DEF: {
      cleanSheetsPerMatch: 0.3,
      tactical: 0.25,
      technical: 0.15,
      assistsPerMatch: 0.1,
      averageRating: 0.1,
      attendanceRate: 0.1,
    },
    MID: {
      assistsPerMatch: 0.25,
      technical: 0.2,
      tactical: 0.2,
      goalsPerMatch: 0.15,
      physical: 0.1,
      attendanceRate: 0.1,
    },
    FWD: {
      goalsPerMatch: 0.4,
      assistsPerMatch: 0.2,
      technical: 0.15,
      physical: 0.1,
      averageRating: 0.1,
      attendanceRate: 0.05,
    },
  };

  constructor(
    private readonly playerStatsService: PlayerStatsService,
    @InjectRepository(Evaluation)
    private readonly evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(Training)
    private readonly trainingsRepository: Repository<Training>,
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
  ) {}

  async getSymbolicTeamOfMonth(month?: string): Promise<TeamOfMonthResponse> {
    const groups = await this.groupsRepository.find({ select: ['id'] });
    const uniqueGroupIds = groups.map((group) => group.id);
    const { start, end, normalizedMonth } = this.resolveMonthRange(month);

    if (uniqueGroupIds.length === 0) {
      return this.buildEmptyResponse(uniqueGroupIds, 0, normalizedMonth);
    }

    const [trainingsCount, matchesCount, teamStats] = await Promise.all([
      this.trainingsRepository.count({
        where: {
          group: { id: In(uniqueGroupIds) },
          startTime: Between(start, end),
        },
      }),
      this.matchesRepository.count({
        where: {
          group: { id: In(uniqueGroupIds) },
          startTime: Between(start, end),
        },
      }),
      this.playerStatsService.getTeamStatsForDateRange(
        uniqueGroupIds,
        { start, end },
        StatsPeriod.THIS_MONTH,
      ),
    ]);

    const groupTotalEvents = trainingsCount + matchesCount;
    const players = teamStats.flatMap((group) => group.players);

    if (players.length === 0) {
      return this.buildEmptyResponse(
        uniqueGroupIds,
        groupTotalEvents,
        normalizedMonth,
      );
    }

    const playerIds = players.map((player) => player.playerId);
    const evaluationMap = await this.getEvaluationMetricsMap(playerIds, start, end);

    const candidates: Candidate[] = players
      .map((player) => {
        const line = this.resolveLine(player.position);
        if (!line) {
          return null;
        }

        const evalMetrics = evaluationMap.get(player.playerId) ?? {
          averageRating: 0,
          technical: 0,
          tactical: 0,
          physical: 0,
          psychological: 0,
        };

        const matchesPlayed = player.matchesPlayed;
        const goalsPerMatch =
          matchesPlayed > 0 ? this.round(player.goals / matchesPlayed) : 0;
        const assistsPerMatch =
          matchesPlayed > 0 ? this.round(player.assists / matchesPlayed) : 0;
        const cleanSheetsPerMatch =
          matchesPlayed > 0 ? this.round(player.cleanSheets / matchesPlayed) : 0;

        return {
          playerId: player.playerId,
          playerName: player.playerName,
          position: player.position,
          line,
          eligibleByEventsThreshold:
            player.attendance.total >= this.minAttendanceEvents,
          metrics: {
            averageRating: evalMetrics.averageRating,
            technical: evalMetrics.technical,
            tactical: evalMetrics.tactical,
            physical: evalMetrics.physical,
            psychological: evalMetrics.psychological,
            matchesPlayed,
            goals: player.goals,
            assists: player.assists,
            cleanSheets: player.cleanSheets,
            goalsPerMatch,
            assistsPerMatch,
            cleanSheetsPerMatch,
            attendanceRate: player.attendance.rate,
            totalEvents: player.attendance.total,
          },
        } satisfies Candidate;
      })
      .filter((candidate): candidate is Candidate => candidate !== null)
      .filter((candidate) => this.hasMeaningfulMonthlyData(candidate.metrics));

    if (candidates.length === 0) {
      return this.buildEmptyResponse(
        uniqueGroupIds,
        groupTotalEvents,
        normalizedMonth,
      );
    }

    const goalkeepers = this.selectTopPlayers(
      candidates.filter((candidate) => candidate.line === 'GK'),
      this.lineSlots.GK,
      this.weights.GK,
    );
    const defenders = this.selectTopPlayers(
      candidates.filter((candidate) => candidate.line === 'DEF'),
      this.lineSlots.DEF,
      this.weights.DEF,
    );
    const midfielders = this.selectTopPlayers(
      candidates.filter((candidate) => candidate.line === 'MID'),
      this.lineSlots.MID,
      this.weights.MID,
    );
    const forwards = this.selectTopPlayers(
      candidates.filter((candidate) => candidate.line === 'FWD'),
      this.lineSlots.FWD,
      this.weights.FWD,
    );

    return {
      formation: this.formation,
      period: StatsPeriod.THIS_MONTH,
      month: normalizedMonth,
      groupIds: uniqueGroupIds,
      groupTotalEvents,
      minRequiredEvents: this.minAttendanceEvents,
      players: {
        goalkeeper: goalkeepers[0] ?? null,
        defenders,
        midfielders,
        forwards,
      },
    };
  }

  private async getEvaluationMetricsMap(
    playerIds: string[],
    start: Date,
    end: Date,
  ): Promise<
    Map<
      string,
      {
        averageRating: number;
        technical: number;
        tactical: number;
        physical: number;
        psychological: number;
      }
    >
  > {
    if (playerIds.length === 0) {
      return new Map();
    }

    const rows = await this.evaluationsRepository
      .createQueryBuilder('e')
      .select('e.playerId', 'playerId')
      .addSelect('AVG(e.technical)', 'technical')
      .addSelect('AVG(e.tactical)', 'tactical')
      .addSelect('AVG(e.physical)', 'physical')
      .addSelect('AVG(e.psychological)', 'psychological')
      .leftJoin('e.training', 't')
      .leftJoin('e.match', 'm')
      .where('e.playerId IN (:...playerIds)', { playerIds })
      .andWhere(
        '((t.startTime BETWEEN :start AND :end) OR (m.startTime BETWEEN :start AND :end))',
        { start, end },
      )
      .groupBy('e.playerId')
      .getRawMany<{
        playerId: string;
        technical: string | null;
        tactical: string | null;
        physical: string | null;
        psychological: string | null;
      }>();

    const map = new Map<
      string,
      {
        averageRating: number;
        technical: number;
        tactical: number;
        physical: number;
        psychological: number;
      }
    >();

    for (const row of rows) {
      const technical = row.technical ? parseFloat(row.technical) : 0;
      const tactical = row.tactical ? parseFloat(row.tactical) : 0;
      const physical = row.physical ? parseFloat(row.physical) : 0;
      const psychological = row.psychological ? parseFloat(row.psychological) : 0;
      const categoryValues = [
        row.technical,
        row.tactical,
        row.physical,
        row.psychological,
      ]
        .filter((value): value is string => value !== null)
        .map((value) => parseFloat(value));
      const averageRating =
        categoryValues.length > 0
          ? this.round(
              categoryValues.reduce((sum, value) => sum + value, 0) /
                categoryValues.length,
            )
          : 0;

      map.set(row.playerId, {
        averageRating,
        technical: this.round(technical),
        tactical: this.round(tactical),
        physical: this.round(physical),
        psychological: this.round(psychological),
      });
    }

    return map;
  }

  private selectTopPlayers(
    candidates: Candidate[],
    take: number,
    weightsByMetric: WeightsByMetric,
  ): TeamOfMonthPlayer[] {
    if (candidates.length === 0) {
      return [];
    }

    const eligible = candidates.filter(
      (candidate) => candidate.eligibleByEventsThreshold,
    );
    const pool = eligible.length > 0 ? eligible : candidates;
    const scored = this.rankByTopsis(pool, weightsByMetric);

    return scored.slice(0, take).map(({ candidate, score }) => ({
      playerId: candidate.playerId,
      playerName: candidate.playerName,
      position: candidate.position,
      line: candidate.line,
      topsisScore: this.round(score),
      eligibleByEventsThreshold: candidate.eligibleByEventsThreshold,
      metrics: candidate.metrics,
    }));
  }

  private rankByTopsis(
    candidates: Candidate[],
    weightsByMetric: WeightsByMetric,
  ): Array<{ candidate: Candidate; score: number }> {
    const metrics = Object.keys(weightsByMetric);
    const weights = metrics.map((metric) => weightsByMetric[metric]);
    const matrix = candidates.map((candidate) =>
      metrics.map((metric) => candidate.metrics[metric as keyof CandidateMetrics]),
    );

    const denominators = metrics.map((_, columnIndex) => {
      const sumSquares = matrix.reduce(
        (sum, row) => sum + row[columnIndex] * row[columnIndex],
        0,
      );
      return Math.sqrt(sumSquares) || 1;
    });

    const weightedMatrix = matrix.map((row) =>
      row.map((value, columnIndex) => {
        const normalized = value / denominators[columnIndex];
        return normalized * weights[columnIndex];
      }),
    );

    const idealBest = metrics.map((_, columnIndex) =>
      Math.max(...weightedMatrix.map((row) => row[columnIndex])),
    );
    const idealWorst = metrics.map((_, columnIndex) =>
      Math.min(...weightedMatrix.map((row) => row[columnIndex])),
    );

    return candidates
      .map((candidate, rowIndex) => {
        const dBest = Math.sqrt(
          weightedMatrix[rowIndex].reduce(
            (sum, value, columnIndex) =>
              sum + (value - idealBest[columnIndex]) ** 2,
            0,
          ),
        );
        const dWorst = Math.sqrt(
          weightedMatrix[rowIndex].reduce(
            (sum, value, columnIndex) =>
              sum + (value - idealWorst[columnIndex]) ** 2,
            0,
          ),
        );
        const score = dBest + dWorst === 0 ? 0 : dWorst / (dBest + dWorst);

        return { candidate, score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        if (b.candidate.metrics.averageRating !== a.candidate.metrics.averageRating) {
          return b.candidate.metrics.averageRating - a.candidate.metrics.averageRating;
        }
        return b.candidate.metrics.attendanceRate - a.candidate.metrics.attendanceRate;
      });
  }

  private resolveLine(position: Position): Line | null {
    if (position === Position.GK) return 'GK';
    if ([Position.CB, Position.LB, Position.RB].includes(position)) return 'DEF';
    if ([Position.CDM, Position.CM, Position.CAM].includes(position)) return 'MID';
    if ([Position.LW, Position.RW, Position.ST].includes(position)) return 'FWD';
    return null;
  }

  private buildEmptyResponse(
    groupIds: string[],
    groupTotalEvents: number,
    month: string,
  ): TeamOfMonthResponse {
    return {
      formation: this.formation,
      period: StatsPeriod.THIS_MONTH,
      month,
      groupIds,
      groupTotalEvents,
      minRequiredEvents: this.minAttendanceEvents,
      players: {
        goalkeeper: null,
        defenders: [],
        midfielders: [],
        forwards: [],
      },
    };
  }

  private round(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  private hasMeaningfulMonthlyData(metrics: CandidateMetrics): boolean {
    return (
      metrics.totalEvents > 0 ||
      metrics.matchesPlayed > 0 ||
      metrics.goals > 0 ||
      metrics.assists > 0 ||
      metrics.cleanSheets > 0 ||
      metrics.averageRating > 0 ||
      metrics.technical > 0 ||
      metrics.tactical > 0 ||
      metrics.physical > 0 ||
      metrics.psychological > 0
    );
  }

  private resolveMonthRange(month?: string): {
    start: Date;
    end: Date;
    normalizedMonth: string;
  } {
    if (!month) {
      const { start, end } = getDateRangeForPeriod(StatsPeriod.THIS_MONTH);
      if (!start || !end) {
        throw new BadRequestException('Failed to resolve current month range');
      }
      return {
        start,
        end,
        normalizedMonth: this.formatMonth(start),
      };
    }

    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
      throw new BadRequestException('Month must be in YYYY-MM format');
    }

    const year = parseInt(match[1], 10);
    const monthIndex = parseInt(match[2], 10) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      throw new BadRequestException('Month must be in YYYY-MM format');
    }

    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (start > currentMonthStart) {
      throw new BadRequestException('Future months are not allowed');
    }

    return {
      start,
      end,
      normalizedMonth: this.formatMonth(start),
    };
  }

  private formatMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
