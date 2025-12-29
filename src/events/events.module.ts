import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Training } from './entities/training.entity';
import { Goal } from './entities/goal.entity';
import { TrainingSchedule } from './entities/training-schedule.entity';
import { TrainingsService } from './trainings.service';
import { MatchesService } from './matches.service';
import { ScheduleService } from './schedule.service';
import { TrainingsController } from './trainings.controller';
import { MatchesController } from './matches.controller';
import { ScheduleController } from './schedule.controller';
import { Group } from '../groups/entities/group.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Match,
      Training,
      Goal,
      TrainingSchedule,
      Group,
      Coach,
      Player,
      Parent,
    ]),
  ],
  controllers: [TrainingsController, MatchesController, ScheduleController],
  providers: [TrainingsService, MatchesService, ScheduleService],
  exports: [TypeOrmModule, ScheduleService],
})
export class EventsModule {}
