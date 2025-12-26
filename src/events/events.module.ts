import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Training } from './entities/training.entity';
import { TrainingsService } from './trainings.service';
import { MatchesService } from './matches.service';
import { TrainingsController } from './trainings.controller';
import { MatchesController } from './matches.controller';
import { Group } from '../groups/entities/group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Match, Training, Group])],
  controllers: [TrainingsController, MatchesController],
  providers: [TrainingsService, MatchesService],
  exports: [TypeOrmModule],
})
export class EventsModule {}
