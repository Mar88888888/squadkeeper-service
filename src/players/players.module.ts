import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { User } from '../users/entities/user.entity';
import { Goal } from '../events/entities/goal.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Group } from '../groups/entities/group.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';
import { PlayersService } from './players.service';
import { PlayerStatsService } from './player-stats.service';
import { TeamOfMonthService } from './team-of-month.service';
import { PlayersController } from './players.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Player,
      User,
      Goal,
      Attendance,
      Group,
      Evaluation,
      Training,
      Match,
    ]),
    UsersModule,
  ],
  controllers: [PlayersController],
  providers: [PlayersService, PlayerStatsService, TeamOfMonthService],
  exports: [TypeOrmModule, PlayersService],
})
export class PlayersModule {}
