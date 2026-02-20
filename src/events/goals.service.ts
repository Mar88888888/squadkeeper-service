import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from './entities/goal.entity';
import { Match } from './entities/match.entity';
import { Player } from '../players/entities/player.entity';
import { MatchesService } from './matches.service';
import { PlayersService } from '../players/players.service';
import { AttendanceService } from '../attendance/attendance.service';
import { AddGoalDto } from './dto/add-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
    private matchesService: MatchesService,
    private playersService: PlayersService,
    private attendanceService: AttendanceService,
  ) {}

  private async validatePlayerPlayed(
    playerId: string,
    matchId: string,
    playerName: string,
    role: 'scorer' | 'assist',
  ): Promise<void> {
    const wasPresent = await this.attendanceService.wasPlayerPresent(
      matchId,
      playerId,
    );

    if (!wasPresent) {
      throw new BadRequestException(
        `Cannot record ${role} for ${playerName} - player was not present at this match`,
      );
    }
  }

  private countGoals(goals: Goal[]): { regular: number; own: number } {
    return {
      regular: goals.filter((g) => !g.isOwnGoal).length,
      own: goals.filter((g) => g.isOwnGoal).length,
    };
  }

  private getTeamGoals(
    match: Match,
    homeGoals: number,
    awayGoals: number,
  ): { ours: number; theirs: number } {
    return match.isHome
      ? { ours: homeGoals, theirs: awayGoals }
      : { ours: awayGoals, theirs: homeGoals };
  }

  private validateGoalWithinScore(
    existingGoals: { regular: number; own: number },
    teamGoals: { ours: number; theirs: number },
    isOwnGoal: boolean,
  ): void {
    if (isOwnGoal) {
      if (existingGoals.own >= teamGoals.theirs) {
        throw new BadRequestException(
          `Cannot add more own goals. Own goals (${existingGoals.own}) already match conceded goals (${teamGoals.theirs})`,
        );
      }
    } else {
      if (existingGoals.regular >= teamGoals.ours) {
        throw new BadRequestException(
          `Cannot add more goals. Recorded goals (${existingGoals.regular}) already match team score (${teamGoals.ours})`,
        );
      }
    }
  }

  async addGoal(matchId: string, addGoalDto: AddGoalDto): Promise<Goal> {
    const match = await this.matchesService.findOne(matchId);

    if (match.homeGoals === null || match.awayGoals === null) {
      throw new BadRequestException(
        'Cannot add goals before match result is set',
      );
    }

    const isOwnGoal = addGoalDto.isOwnGoal || false;

    this.validateGoalWithinScore(
      this.countGoals(match.goals),
      this.getTeamGoals(match, match.homeGoals, match.awayGoals),
      isOwnGoal,
    );

    const scorer = await this.playersService.findOne(addGoalDto.scorerId);
    await this.validatePlayerPlayed(
      scorer.id,
      matchId,
      `${scorer.firstName} ${scorer.lastName}`,
      'scorer',
    );

    let assist: Player | null = null;
    if (addGoalDto.assistId) {
      assist = await this.playersService.findOne(addGoalDto.assistId);
      await this.validatePlayerPlayed(
        assist.id,
        matchId,
        `${assist.firstName} ${assist.lastName}`,
        'assist',
      );
    }

    const goal = this.goalsRepository.create({
      match,
      scorer,
      assist,
      minute: addGoalDto.minute || null,
      isOwnGoal,
    });

    return await this.goalsRepository.save(goal);
  }

  async removeGoal(matchId: string, goalId: string): Promise<void> {
    const goal = await this.goalsRepository.findOne({
      where: { id: goalId, match: { id: matchId } },
    });

    if (goal) {
      await this.goalsRepository.remove(goal);
    }
  }

  async getGoals(matchId: string): Promise<Goal[]> {
    return await this.goalsRepository.find({
      where: { match: { id: matchId } },
      relations: ['scorer', 'assist'],
      order: { minute: 'ASC' },
    });
  }
}
