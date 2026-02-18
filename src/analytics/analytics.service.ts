import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Player } from '../players/entities/player.entity';
import { Match } from '../events/entities/match.entity';
import { Goal } from '../events/entities/goal.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Group } from '../groups/entities/group.entity';
import {
  PerformanceSettings,
  PositionExpectations,
} from './entities/performance-settings.entity';
import { StatsPeriod } from '../common/enums/stats-period.enum';
import { getDateRangeForPeriod } from '../common/utils/date-range.util';
import { Position } from '../players/enums/position.enum';
import {
  DEFAULT_WEIGHTS,
  DEFAULT_POSITION_EXPECTATIONS,
} from './constants/default-settings';
import {
  PerformanceScoreResponse,
  TeamPerformanceScoreResponse,
  PerformanceScoreComponents,
  PerformanceWeights,
} from './dto/performance-score.dto';

interface CalculationSettings {
  skillWeight: number;
  offenseWeight: number;
  defenseWeight: number;
  teamWeight: number;
  positionExpectations: PositionExpectations;
}

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
    @InjectRepository(PerformanceSettings)
    private settingsRepository: Repository<PerformanceSettings>,
  ) {}

  private async getSettingsForGroup(
    groupId: string | null,
  ): Promise<CalculationSettings> {
    if (!groupId) {
      return {
        ...DEFAULT_WEIGHTS,
        positionExpectations: DEFAULT_POSITION_EXPECTATIONS,
      };
    }

    const settings = await this.settingsRepository.findOne({
      where: { groupId },
    });

    if (settings) {
      return {
        skillWeight: settings.skillWeight,
        offenseWeight: settings.offenseWeight,
        defenseWeight: settings.defenseWeight,
        teamWeight: settings.teamWeight,
        positionExpectations: this.mergePositionExpectations(
          settings.positionExpectations,
        ),
      };
    }

    return {
      ...DEFAULT_WEIGHTS,
      positionExpectations: DEFAULT_POSITION_EXPECTATIONS,
    };
  }

  private mergePositionExpectations(
    customExpectations: Partial<PositionExpectations>,
  ): PositionExpectations {
    const result = { ...DEFAULT_POSITION_EXPECTATIONS };

    for (const [position, expectations] of Object.entries(
      customExpectations || {},
    )) {
      if (result[position as keyof PositionExpectations]) {
        result[position as keyof PositionExpectations] = {
          ...result[position as keyof PositionExpectations],
          ...expectations,
        };
      }
    }

    return result;
  }

  async getPerformanceScore(
    playerId: string,
    period: StatsPeriod = StatsPeriod.ALL_TIME,
  ): Promise<PerformanceScoreResponse> {
    const player = await this.playersRepository.findOne({
      where: { id: playerId },
      relations: ['group'],
    });

    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    const settings = await this.getSettingsForGroup(player.group?.id || null);
    const dateRange = getDateRangeForPeriod(period);

    const {
      matchesPlayed,
      goals,
      assists,
      cleanSheets,
      wins,
      draws,
      losses,
      winRate,
    } = await this.getMatchStats(playerId, dateRange);

    const { averageRating, totalEvents, byCategory } =
      await this.getEvaluationStats(playerId, dateRange);

    const components = this.calculatePerformanceComponents(
      player.position,
      matchesPlayed,
      goals,
      assists,
      cleanSheets,
      winRate,
      averageRating,
      settings,
    );

    const performanceScore =
      Math.round(
        (components.skill +
          components.offense +
          components.defense +
          components.team) *
          10,
      ) / 10;

    const weights: PerformanceWeights = {
      skillWeight: settings.skillWeight,
      offenseWeight: settings.offenseWeight,
      defenseWeight: settings.defenseWeight,
      teamWeight: settings.teamWeight,
    };

    return {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      performanceScore,
      components,
      weights,
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
    const matchesQuery = this.attendanceRepository
      .createQueryBuilder('a')
      .innerJoin('a.match', 'm')
      .select(['a.id', 'm.homeGoals', 'm.awayGoals', 'm.isHome'])
      .where('a.player.id = :playerId', { playerId })
      .andWhere('a.match IS NOT NULL')
      .andWhere('a.isPresent = true')
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

    const winRate =
      matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) / 100 : 0;

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

    const cleanSheetsQuery = this.attendanceRepository
      .createQueryBuilder('a')
      .innerJoin('a.match', 'm')
      .where('a.player.id = :playerId', { playerId })
      .andWhere('a.match IS NOT NULL')
      .andWhere('a.isPresent = true')
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

    return {
      matchesPlayed,
      goals,
      assists,
      cleanSheets,
      wins,
      draws,
      losses,
      winRate,
    };
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

      const categories: (keyof typeof categoryRatings)[] = [
        'technical',
        'tactical',
        'physical',
        'psychological',
      ];
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
      return (
        Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
      );
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
    settings: CalculationSettings,
  ): PerformanceScoreComponents {
    const {
      skillWeight,
      offenseWeight,
      defenseWeight,
      teamWeight,
      positionExpectations,
    } = settings;
    const expectations =
      positionExpectations[position] ||
      DEFAULT_POSITION_EXPECTATIONS[Position.CM];

    const skill =
      averageRating !== null
        ? Math.round((averageRating / 10) * skillWeight * 10) / 10
        : 0;

    let offense = 0;
    if (matchesPlayed > 0) {
      const goalsPerMatch = goals / matchesPlayed;
      const assistsPerMatch = assists / matchesPlayed;

      const goalRatio =
        expectations.expectedGoalsPerMatch > 0
          ? Math.min(goalsPerMatch / expectations.expectedGoalsPerMatch, 1.5)
          : 0;

      const assistRatio =
        expectations.expectedAssistsPerMatch > 0
          ? Math.min(
              assistsPerMatch / expectations.expectedAssistsPerMatch,
              1.5,
            )
          : 0;

      const combinedRatio = goalRatio * 0.6 + assistRatio * 0.4;
      offense = Math.round((combinedRatio / 1.5) * offenseWeight * 10) / 10;
    }

    let defense = 0;
    if (matchesPlayed > 0) {
      const cleanSheetRate = cleanSheets / matchesPlayed;
      defense = Math.round(cleanSheetRate * defenseWeight * 10) / 10;
    }

    const winRateContribution = winRate * teamWeight * 0.7;
    const participationBonus =
      Math.min(matchesPlayed / 10, 1) * teamWeight * 0.3;
    const team =
      Math.round((winRateContribution + participationBonus) * 10) / 10;

    return { skill, offense, defense, team };
  }
}
