import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';
import { User } from '../users/entities/user.entity';
import { Player } from '../players/entities/player.entity';
import { ParentsService } from './parents.service';
import { ParentsController } from './parents.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Parent, User, Player]), UsersModule],
  controllers: [ParentsController],
  providers: [ParentsService],
  exports: [TypeOrmModule, ParentsService],
})
export class ParentsModule {}
