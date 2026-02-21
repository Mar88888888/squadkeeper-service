import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { User } from '../users/entities/user.entity';
import { Goal } from '../events/entities/goal.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Group } from '../groups/entities/group.entity';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Player, User, Goal, Attendance, Group]),
    UsersModule,
  ],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [TypeOrmModule, PlayersService],
})
export class PlayersModule {}
