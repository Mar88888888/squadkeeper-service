import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Training } from './entities/training.entity';
import { TrainingsService } from './trainings.service';
import { MatchesService } from './matches.service';
import { TrainingsController } from './trainings.controller';
import { MatchesController } from './matches.controller';
import { Group } from '../groups/entities/group.entity';
import { Coach } from '../coaches/entities/coach.entity';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Match, Training, Group, Coach, Player, Parent])],
  controllers: [TrainingsController, MatchesController],
  providers: [TrainingsService, MatchesService],
  exports: [TypeOrmModule],
})
export class EventsModule {}
