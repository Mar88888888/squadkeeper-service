import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './entities/group.entity';
import { CoachesModule } from '../coaches/coaches.module';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group]),
    CoachesModule,
    PlayersModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
