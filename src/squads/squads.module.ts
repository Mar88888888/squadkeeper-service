import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SquadsService } from './squads.service';
import { SquadsController } from './squads.controller';
import { Squad } from './entities/squad.entity';
import { SquadPosition } from './entities/squad-position.entity';
import { Player } from '../players/entities/player.entity';
import { GroupsModule } from '../groups/groups.module';
import { CoachesModule } from '../coaches/coaches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Squad, SquadPosition, Player]),
    GroupsModule,
    CoachesModule,
  ],
  controllers: [SquadsController],
  providers: [SquadsService],
  exports: [SquadsService],
})
export class SquadsModule {}
