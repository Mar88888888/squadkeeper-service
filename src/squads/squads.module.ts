import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SquadsService } from './squads.service';
import { SquadsController } from './squads.controller';
import { Squad } from './entities/squad.entity';
import { SquadPosition } from './entities/squad-position.entity';
import { Group } from '../groups/entities/group.entity';
import { Player } from '../players/entities/player.entity';
import { Coach } from '../coaches/entities/coach.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Squad, SquadPosition, Group, Player, Coach]),
  ],
  controllers: [SquadsController],
  providers: [SquadsService],
  exports: [SquadsService],
})
export class SquadsModule {}
