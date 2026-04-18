import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluationsService } from './evaluations.service';
import { EvaluationsController } from './evaluations.controller';
import { PlayersModule } from '../players/players.module';
import { ParentsModule } from '../parents/parents.module';
import { EventsModule } from '../events/events.module';
import { ObjectivesModule } from '../objectives/objectives.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evaluation]),
    PlayersModule,
    ParentsModule,
    EventsModule,
    ObjectivesModule,
  ],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
