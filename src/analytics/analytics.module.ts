import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Player } from '../players/entities/player.entity';
import { Match } from '../events/entities/match.entity';
import { Goal } from '../events/entities/goal.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Group } from '../groups/entities/group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Player,
      Match,
      Goal,
      Attendance,
      Evaluation,
      Coach,
      Group,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
