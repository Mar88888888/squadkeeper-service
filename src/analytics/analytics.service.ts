import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Player } from '../players/entities/player.entity';
import { Match } from '../events/entities/match.entity';
import { Goal } from '../events/entities/goal.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Group } from '../groups/entities/group.entity';
import { AttendanceStatus } from '../attendance/enums/attendance-status.enum';
import { StatsPeriod } from '../players/dto/player-stats.dto';
import { Position } from '../players/enums/position.enum';
import {
  PerformanceScoreResponse,
  TeamPerformanceScoreResponse,
  GOAL_POSITION_WEIGHTS,
  DEFENSIVE_POSITIONS,
  POSITION_SCORE_WEIGHTS,
} from './dto/performance-score.dto';
import {
  TeamChemistryResponse,
  PlayerCombinationStats,
  CorePlayer,
  PlayerInfo,
} from './dto/team-chemistry.dto';

// Minimum matches for chemistry analysis
const MIN_MATCHES_FOR_CHEMISTRY = 3;

// Statuses that count as "played"
const PLAYED_STATUSES = [AttendanceStatus.PRESENT, AttendanceStatus.LATE];

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
  ) {}

  private getDateRangeForPeriod(period: StatsPeriod): { start?: Date; end?: Date } {
    const now = new Date();

    switch (period) {
      case StatsPeriod.THIS_MONTH: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }
      case StatsPeriod.THIS_SEASON: {
        const seasonStartMonth = 6; // July
        const seasonStartDay = 15;
        let seasonStartYear = now.getFullYear();
        if (now.getMonth() < seasonStartMonth ||
            (now.getMonth() === seasonStartMonth && now.getDate() < seasonStartDay)) {
          seasonStartYear--;
        }
        const start = new Date(seasonStartYear, seasonStartMonth, seasonStartDay);
        const end = new Date(seasonStartYear + 1, seasonStartMonth, seasonStartDay - 1, 23, 59, 59, 999);
        return { start, end };
      }
      case StatsPeriod.THIS_YEAR: {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end };
      }
      case StatsPeriod.ALL_TIME:
      default:
        return {};
    }
  }

  // ========== PERFORMANCE SCORE ==========

  async getPerformanceScore(
    playerId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<PerformanceScoreResponse> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    const dateRange = this.getDateRangeForPeriod(period);

    // Get match stats
    const { matchesPlayed, goals, assists, cleanSheets, wins, draws, losses, winRate } =
      await this.getMatchStats(playerId, dateRange);

    // Get evaluation stats
    const { averageRating, totalEvents, byCategory } = await this.getEvaluationStats(
      playerId,
      dateRange,
    );

    // Calculate component scores
    const components = this.calculatePerformanceComponents(
      player.position,
      matchesPlayed,
      goals,
      assists,
      cleanSheets,
      winRate,
      averageRating,
    );

    const performanceScore = Math.round(
      (components.evaluationScore +
        components.goalContribution +
        components.assistContribution +
        components.cleanSheetContribution +
        components.winRateContribution +
        components.participationBonus) * 10
    ) / 10;

    // Get position-specific weights for frontend display
    const maxWeights = POSITION_SCORE_WEIGHTS[player.position] || POSITION_SCORE_WEIGHTS[Position.CM];

    return {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      performanceScore,
      components,
      maxWeights,
      rawStats: {
        matchesPlayed,
        goals,
        assists,
        cleanSheets,
        wins,
        draws,
        losses,
        winRate,
        evaluationCount: totalEvents,
        averageEvaluationRating: averageRating,
        byCategory,
      },
      period,
    };
  }

  async getMyPerformanceScore(
    userId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<PerformanceScoreResponse> {
    const player = await this.playersRepository
      .createQueryBuilder('player')
      .innerJoin('player.user', 'user')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!player) {
      throw new NotFoundException('Player profile not found');
    }

    return this.getPerformanceScore(player.id, period);
  }

  async getTeamPerformanceScores(
    groupId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<TeamPerformanceScoreResponse> {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['players'],
    });

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    const playerScores: PerformanceScoreResponse[] = [];

    for (const player of group.players) {
      const score = await this.getPerformanceScore(player.id, period);
      playerScores.push(score);
    }

    // Sort by performance score descending
    playerScores.sort((a, b) => b.performanceScore - a.performanceScore);

    return {
      groupId: group.id,
      groupName: group.name,
      players: playerScores,
      period,
    };
  }

  async getCoachTeamsPerformanceScores(
    userId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<TeamPerformanceScoreResponse[]> {
    const coach = await this.coachesRepository.findOne({
      where: { user: { id: userId } },
      relations: ['headGroups', 'assistantGroups'],
    });

    if (!coach) {
      throw new NotFoundException('Coach profile not found');
    }

    const groupIds = [
      ...coach.headGroups.map((g) => g.id),
      ...coach.assistantGroups.map((g) => g.id),
    ];

    const results: TeamPerformanceScoreResponse[] = [];

    for (const groupId of groupIds) {
      const teamScores = await this.getTeamPerformanceScores(groupId, period);
      results.push(teamScores);
    }

    return results;
  }

  private async getMatchStats(
    playerId: string,
    dateRange: { start?: Date; end?: Date },
  ): Promise<{
    matchesPlayed: number;
    goals: number;
    assists: number;
    cleanSheets: number;
    wins: number;
    draws: number;
    losses: number;
    winRate: number;
  }> {
    // Get matches played with results for win/draw/loss calculation
    const matchesQuery = this.attendanceRepository
      .createQueryBuilder('a')
      .innerJoin('a.match', 'm')
      .select(['a.id', 'm.homeGoals', 'm.awayGoals', 'm.isHome'])
      .where('a.player.id = :playerId', { playerId })
      .andWhere('a.match IS NOT NULL')
      .andWhere('a.status IN (:...statuses)', { statuses: PLAYED_STATUSES })
      .andWhere('m.homeGoals IS NOT NULL')
      .andWhere('m.awayGoals IS NOT NULL');

    if (dateRange.start && dateRange.end) {
      matchesQuery.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const attendances = await matchesQuery.getRawMany();
    const matchesPlayed = attendances.length;

    // Calculate wins, draws, losses
    let wins = 0;
    let draws = 0;
    let losses = 0;

    for (const att of attendances) {
      const homeGoals = att.m_homeGoals;
      const awayGoals = att.m_awayGoals;
      const isHome = att.m_isHome;

      const ourGoals = isHome ? homeGoals : awayGoals;
      const theirGoals = isHome ? awayGoals : homeGoals;

      if (ourGoals > theirGoals) wins++;
      else if (ourGoals < theirGoals) losses++;
      else draws++;
    }

    const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) / 100 : 0;

    // Count goals
    const goalsQuery = this.goalsRepository
      .createQueryBuilder('g')
      .innerJoin('g.match', 'm')
      .where('g.scorer.id = :playerId', { playerId })
      .andWhere('g.isOwnGoal = false');

    if (dateRange.start && dateRange.end) {
      goalsQuery.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const goals = await goalsQuery.getCount();

    // Count assists
    const assistsQuery = this.goalsRepository
      .createQueryBuilder('g')
      .innerJoin('g.match', 'm')
      .where('g.assist.id = :playerId', { playerId });

    if (dateRange.start && dateRange.end) {
      assistsQuery.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const assists = await assistsQuery.getCount();

    // Count clean sheets (for all positions - weighted differently in scoring)
    const cleanSheetsQuery = this.attendanceRepository
      .createQueryBuilder('a')
      .innerJoin('a.match', 'm')
      .where('a.player.id = :playerId', { playerId })
      .andWhere('a.match IS NOT NULL')
      .andWhere('a.status IN (:...statuses)', { statuses: PLAYED_STATUSES })
      .andWhere('m.homeGoals IS NOT NULL')
      .andWhere('m.awayGoals IS NOT NULL')
      .andWhere(
        '((m.isHome = true AND m.awayGoals = 0) OR (m.isHome = false AND m.homeGoals = 0))',
      );

    if (dateRange.start && dateRange.end) {
      cleanSheetsQuery.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const cleanSheets = await cleanSheetsQuery.getCount();

    return { matchesPlayed, goals, assists, cleanSheets, wins, draws, losses, winRate };
  }

  private async getEvaluationStats(
    playerId: string,
    dateRange: { start?: Date; end?: Date },
  ): Promise<{
    averageRating: number | null;
    totalEvents: number;
    byCategory: {
      technical: number | null;
      tactical: number | null;
      physical: number | null;
      psychological: number | null;
    };
  }> {
    // Get all evaluations for the player
    const query = this.evaluationsRepository
      .createQueryBuilder('e')
      .leftJoin('e.training', 't')
      .leftJoin('e.match', 'm')
      .where('e.player.id = :playerId', { playerId });

    if (dateRange.start && dateRange.end) {
      query.andWhere(
        '((t.startTime BETWEEN :start AND :end) OR (m.startTime BETWEEN :start AND :end))',
        { start: dateRange.start, end: dateRange.end },
      );
    }

    const evaluations = await query
      .leftJoinAndSelect('e.training', 'training')
      .leftJoinAndSelect('e.match', 'match')
      .getMany();

    // Group by event to count unique events
    const eventSet = new Set<string>();
    const categoryRatings: { [key: string]: number[] } = {
      technical: [],
      tactical: [],
      physical: [],
      psychological: [],
    };
    const allRatings: number[] = [];

    for (const evaluation of evaluations) {
      const eventKey = evaluation.training
        ? `training-${evaluation.training.id}`
        : evaluation.match
          ? `match-${evaluation.match.id}`
          : null;

      if (eventKey) {
        eventSet.add(eventKey);
      }

      // Collect ratings from each category column
      const categories: (keyof typeof categoryRatings)[] = ['technical', 'tactical', 'physical', 'psychological'];
      for (const category of categories) {
        const rating = evaluation[category];
        if (rating !== null && rating !== undefined) {
          categoryRatings[category].push(rating);
          allRatings.push(rating);
        }
      }
    }

    const calculateAverage = (arr: number[]): number | null => {
      if (arr.length === 0) return null;
      return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
    };

    return {
      averageRating: calculateAverage(allRatings),
      totalEvents: eventSet.size,
      byCategory: {
        technical: calculateAverage(categoryRatings.technical),
        tactical: calculateAverage(categoryRatings.tactical),
        physical: calculateAverage(categoryRatings.physical),
        psychological: calculateAverage(categoryRatings.psychological),
      },
    };
  }

  private calculatePerformanceComponents(
    position: Position,
    matchesPlayed: number,
    goals: number,
    assists: number,
    cleanSheets: number,
    winRate: number,
    averageRating: number | null,
  ): {
    evaluationScore: number;
    goalContribution: number;
    assistContribution: number;
    cleanSheetContribution: number;
    winRateContribution: number;
    participationBonus: number;
  } {
    // Get position-specific max weights
    const weights = POSITION_SCORE_WEIGHTS[position] || POSITION_SCORE_WEIGHTS[Position.CM];
    const { goalMax, assistMax, cleanSheetMax } = weights;

    // Evaluation component: 35 points max (average rating / 10 * 35)
    const evaluationScore = averageRating !== null
      ? Math.round((averageRating / 10) * 35 * 10) / 10
      : 0;

    // Goal component: position-dependent max points
    // Split into rate (70%) and volume (30%) to reward consistent high performers
    let goalContribution = 0;
    if (matchesPlayed > 0 && goalMax > 0) {
      const goalsPerMatch = goals / matchesPlayed;
      const positionWeight = GOAL_POSITION_WEIGHTS[position] || 0.5;
      // Target: 0.6 goals/match for attackers (adjusted by position weight)
      const targetGoalsPerMatch = 0.6 * positionWeight;

      // Rate component: 70% of goalMax, uses sqrt for diminishing returns
      const rateMaxPoints = goalMax * 0.7;
      const rateScore = Math.min(Math.sqrt(goalsPerMatch / targetGoalsPerMatch), 1.4) / 1.4;
      const rateContribution = rateScore * rateMaxPoints;

      // Volume component: 30% of goalMax, rewards total goals
      const volumeMaxPoints = goalMax * 0.3;
      const volumeTarget = Math.max(3, matchesPlayed * 0.4 * positionWeight);
      const volumeScore = Math.min(goals / volumeTarget, 1);
      const volumeContribution = volumeScore * volumeMaxPoints;

      goalContribution = Math.round((rateContribution + volumeContribution) * 10) / 10;
    }

    // Assist component: position-dependent max points
    // Split into rate (70%) and volume (30%)
    let assistContribution = 0;
    if (matchesPlayed > 0 && assistMax > 0) {
      const assistsPerMatch = assists / matchesPlayed;
      // Target: 0.5 assists/match

      // Rate component: 70% of assistMax
      const rateMaxPoints = assistMax * 0.7;
      const rateScore = Math.min(Math.sqrt(assistsPerMatch / 0.5), 1.3) / 1.3;
      const rateContribution = rateScore * rateMaxPoints;

      // Volume component: 30% of assistMax, rewards total assists
      const volumeMaxPoints = assistMax * 0.3;
      const volumeTarget = Math.max(2, matchesPlayed * 0.3);
      const volumeScore = Math.min(assists / volumeTarget, 1);
      const volumeContribution = volumeScore * volumeMaxPoints;

      assistContribution = Math.round((rateContribution + volumeContribution) * 10) / 10;
    }

    // Clean sheet component: position-dependent max points
    // All positions can now earn clean sheet points (just weighted differently)
    let cleanSheetContribution = 0;
    if (matchesPlayed > 0 && cleanSheetMax > 0) {
      const cleanSheetRate = cleanSheets / matchesPlayed;
      cleanSheetContribution = Math.round(cleanSheetRate * cleanSheetMax * 10) / 10;
    }

    // Win rate component: 10 points max
    // Slightly less impactful since it's team-based
    const winRateContribution = Math.round(winRate * 10 * 10) / 10;

    // Participation bonus: 5 points max
    // Rewards players who play more matches (up to 5 matches for max)
    const participationBonus = Math.round(Math.min(matchesPlayed / 5, 1) * 5 * 10) / 10;

    return {
      evaluationScore,
      goalContribution,
      assistContribution,
      cleanSheetContribution,
      winRateContribution,
      participationBonus,
    };
  }

  // ========== TEAM CHEMISTRY ==========

  async getTeamChemistry(
    groupId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
    minimumMatches: number = MIN_MATCHES_FOR_CHEMISTRY,
  ): Promise<TeamChemistryResponse> {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['players'],
    });

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    const dateRange = this.getDateRangeForPeriod(period);

    // Get all matches for the group with results
    const matchesQuery = this.matchesRepository
      .createQueryBuilder('m')
      .where('m.group.id = :groupId', { groupId })
      .andWhere('m.homeGoals IS NOT NULL')
      .andWhere('m.awayGoals IS NOT NULL');

    if (dateRange.start && dateRange.end) {
      matchesQuery.andWhere('m.startTime BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const matches = await matchesQuery.getMany();

    // Build player info map
    const playerInfoMap = new Map<string, PlayerInfo>();
    for (const player of group.players) {
      playerInfoMap.set(player.id, {
        id: player.id,
        name: `${player.firstName} ${player.lastName}`,
        position: player.position,
      });
    }

    // Get match data with players who played
    const matchDataList: Array<{
      matchId: string;
      playerIds: string[];
      isWin: boolean;
      isDraw: boolean;
      goalsScored: number;
      goalsConceded: number;
    }> = [];

    for (const match of matches) {
      // Get players who played in this match
      const attendances = await this.attendanceRepository.find({
        where: {
          match: { id: match.id },
          status: AttendanceStatus.PRESENT,
        },
        relations: ['player'],
      });

      // Also include LATE players
      const lateAttendances = await this.attendanceRepository.find({
        where: {
          match: { id: match.id },
          status: AttendanceStatus.LATE,
        },
        relations: ['player'],
      });

      const playerIds = [
        ...attendances.map((a) => a.player.id),
        ...lateAttendances.map((a) => a.player.id),
      ].filter((id) => playerInfoMap.has(id));

      if (playerIds.length < 2) continue;

      const goalsScored = match.isHome ? match.homeGoals! : match.awayGoals!;
      const goalsConceded = match.isHome ? match.awayGoals! : match.homeGoals!;
      const isWin = goalsScored > goalsConceded;
      const isDraw = goalsScored === goalsConceded;

      matchDataList.push({
        matchId: match.id,
        playerIds,
        isWin,
        isDraw,
        goalsScored,
        goalsConceded,
      });
    }

    // Generate combinations and calculate stats
    const pairStats = new Map<string, {
      players: string[];
      matches: string[];
      wins: number;
      draws: number;
      losses: number;
      goalsScored: number;
      goalsConceded: number;
    }>();

    const trioStats = new Map<string, {
      players: string[];
      matches: string[];
      wins: number;
      draws: number;
      losses: number;
      goalsScored: number;
      goalsConceded: number;
    }>();

    for (const matchData of matchDataList) {
      const { playerIds, matchId, isWin, isDraw, goalsScored, goalsConceded } = matchData;

      // Generate pairs
      for (let i = 0; i < playerIds.length; i++) {
        for (let j = i + 1; j < playerIds.length; j++) {
          const key = [playerIds[i], playerIds[j]].sort().join('-');
          if (!pairStats.has(key)) {
            pairStats.set(key, {
              players: [playerIds[i], playerIds[j]].sort(),
              matches: [],
              wins: 0,
              draws: 0,
              losses: 0,
              goalsScored: 0,
              goalsConceded: 0,
            });
          }
          const stats = pairStats.get(key)!;
          stats.matches.push(matchId);
          if (isWin) stats.wins++;
          else if (isDraw) stats.draws++;
          else stats.losses++;
          stats.goalsScored += goalsScored;
          stats.goalsConceded += goalsConceded;
        }
      }

      // Generate trios
      for (let i = 0; i < playerIds.length; i++) {
        for (let j = i + 1; j < playerIds.length; j++) {
          for (let k = j + 1; k < playerIds.length; k++) {
            const key = [playerIds[i], playerIds[j], playerIds[k]].sort().join('-');
            if (!trioStats.has(key)) {
              trioStats.set(key, {
                players: [playerIds[i], playerIds[j], playerIds[k]].sort(),
                matches: [],
                wins: 0,
                draws: 0,
                losses: 0,
                goalsScored: 0,
                goalsConceded: 0,
              });
            }
            const stats = trioStats.get(key)!;
            stats.matches.push(matchId);
            if (isWin) stats.wins++;
            else if (isDraw) stats.draws++;
            else stats.losses++;
            stats.goalsScored += goalsScored;
            stats.goalsConceded += goalsConceded;
          }
        }
      }
    }

    // Convert to response format and calculate chemistry scores
    const buildCombinationStats = async (
      statsMap: Map<string, any>,
      minMatches: number,
    ): Promise<PlayerCombinationStats[]> => {
      const results: PlayerCombinationStats[] = [];

      for (const [, stats] of statsMap) {
        if (stats.matches.length < minMatches) continue;

        const matchesTogether = stats.matches.length;
        const winRate = Math.round((stats.wins / matchesTogether) * 100);
        const goalDifference = stats.goalsScored - stats.goalsConceded;
        const avgGoalDifference = Math.round((goalDifference / matchesTogether) * 100) / 100;

        // Get average evaluation rating for these players in these matches
        let avgRating: number | null = null;
        const evaluations = await this.evaluationsRepository
          .createQueryBuilder('e')
          .innerJoin('e.match', 'm')
          .where('e.player.id IN (:...playerIds)', { playerIds: stats.players })
          .andWhere('m.id IN (:...matchIds)', { matchIds: stats.matches })
          .getMany();

        if (evaluations.length > 0) {
          // Calculate average from all non-null category ratings
          const allRatings: number[] = [];
          for (const e of evaluations) {
            if (e.technical !== null) allRatings.push(e.technical);
            if (e.tactical !== null) allRatings.push(e.tactical);
            if (e.physical !== null) allRatings.push(e.physical);
            if (e.psychological !== null) allRatings.push(e.psychological);
          }
          if (allRatings.length > 0) {
            avgRating = Math.round(
              (allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length) * 10
            ) / 10;
          }
        }

        // Calculate chemistry score
        // Formula: (WinRate * 0.4) + (NormalizedGoalDiff * 0.35) + (NormalizedEval * 0.25)
        const normalizedGoalDiff = Math.min(Math.max((avgGoalDifference + 3) / 6, 0), 1) * 100;
        const normalizedEval = avgRating !== null ? (avgRating / 10) * 100 : 50;
        const chemistryScore = Math.round(
          (winRate * 0.4 + normalizedGoalDiff * 0.35 + normalizedEval * 0.25) * 10
        ) / 10;

        results.push({
          players: stats.players.map((id: string) => playerInfoMap.get(id)!),
          matchesTogether,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          winRate,
          goalsScored: stats.goalsScored,
          goalsConceded: stats.goalsConceded,
          goalDifference,
          avgGoalDifference,
          averageEvaluationRating: avgRating,
          chemistryScore,
        });
      }

      // Sort by chemistry score descending
      results.sort((a, b) => b.chemistryScore - a.chemistryScore);
      return results;
    };

    const bestPairs = await buildCombinationStats(pairStats, minimumMatches);
    const bestTrios = await buildCombinationStats(trioStats, minimumMatches);

    // Identify core players
    const corePlayers = this.identifyCorePlayers(
      [...bestPairs.slice(0, 10), ...bestTrios.slice(0, 5)],
      playerInfoMap,
    );

    return {
      groupId: group.id,
      groupName: group.name,
      period,
      minimumMatches,
      totalMatchesAnalyzed: matchDataList.length,
      bestPairs: bestPairs.slice(0, 10),
      bestTrios: bestTrios.slice(0, 5),
      corePlayers,
    };
  }

  async getCoachTeamsChemistry(
    userId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<TeamChemistryResponse[]> {
    const coach = await this.coachesRepository.findOne({
      where: { user: { id: userId } },
      relations: ['headGroups', 'assistantGroups'],
    });

    if (!coach) {
      throw new NotFoundException('Coach profile not found');
    }

    const groupIds = [
      ...coach.headGroups.map((g) => g.id),
      ...coach.assistantGroups.map((g) => g.id),
    ];

    const results: TeamChemistryResponse[] = [];

    for (const groupId of groupIds) {
      const chemistry = await this.getTeamChemistry(groupId, period);
      results.push(chemistry);
    }

    return results;
  }

  private identifyCorePlayers(
    topCombinations: PlayerCombinationStats[],
    playerInfoMap: Map<string, PlayerInfo>,
  ): CorePlayer[] {
    const playerAppearances = new Map<string, {
      count: number;
      chemistryScores: number[];
    }>();

    for (const combo of topCombinations) {
      for (const player of combo.players) {
        if (!playerAppearances.has(player.id)) {
          playerAppearances.set(player.id, { count: 0, chemistryScores: [] });
        }
        const data = playerAppearances.get(player.id)!;
        data.count++;
        data.chemistryScores.push(combo.chemistryScore);
      }
    }

    const corePlayers: CorePlayer[] = [];

    for (const [playerId, data] of playerAppearances) {
      const playerInfo = playerInfoMap.get(playerId);
      if (!playerInfo) continue;

      const avgChemistry = Math.round(
        (data.chemistryScores.reduce((a, b) => a + b, 0) / data.chemistryScores.length) * 10
      ) / 10;

      corePlayers.push({
        id: playerInfo.id,
        name: playerInfo.name,
        position: playerInfo.position,
        appearanceInWinningCombinations: data.count,
        averageChemistryScore: avgChemistry,
      });
    }

    // Sort by appearances then by chemistry score
    corePlayers.sort((a, b) => {
      if (b.appearanceInWinningCombinations !== a.appearanceInWinningCombinations) {
        return b.appearanceInWinningCombinations - a.appearanceInWinningCombinations;
      }
      return b.averageChemistryScore - a.averageChemistryScore;
    });

    return corePlayers.slice(0, 10);
  }
}
