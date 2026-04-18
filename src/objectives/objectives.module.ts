import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObjectivesController } from './objectives.controller';
import { ObjectivesService } from './objectives.service';
import { Objective } from './entities/objective.entity';
import { Player } from '../players/entities/player.entity';
import { Group } from '../groups/entities/group.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Goal } from '../events/entities/goal.entity';
import { Match } from '../events/entities/match.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Objective,
      Player,
      Group,
      Attendance,
      Goal,
      Match,
      Evaluation,
    ]),
  ],
  controllers: [ObjectivesController],
  providers: [ObjectivesService],
  exports: [ObjectivesService],
})
export class ObjectivesModule {}
