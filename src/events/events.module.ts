import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Training } from './entities/training.entity';
import { Goal } from './entities/goal.entity';
import { TrainingSchedule } from './entities/training-schedule.entity';
import { TrainingsService } from './trainings.service';
import { MatchesService } from './matches.service';
import { GoalsService } from './goals.service';
import { ScheduleService } from './schedule.service';
import { TrainingsController } from './trainings.controller';
import { MatchesController } from './matches.controller';
import { ScheduleController } from './schedule.controller';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { PlayersModule } from '../players/players.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { ObjectivesModule } from '../objectives/objectives.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Training, Goal, TrainingSchedule]),
    AuthModule,
    GroupsModule,
    PlayersModule,
    AttendanceModule,
    ObjectivesModule,
  ],
  controllers: [TrainingsController, MatchesController, ScheduleController],
  providers: [TrainingsService, MatchesService, GoalsService, ScheduleService],
  exports: [TypeOrmModule, ScheduleService, TrainingsService, MatchesService],
})
export class EventsModule {}
