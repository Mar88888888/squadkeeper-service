import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coach } from './entities/coach.entity';
import { User } from '../users/entities/user.entity';
import { CoachesService } from './coaches.service';
import { CoachesController } from './coaches.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Coach, User]), UsersModule],
  controllers: [CoachesController],
  providers: [CoachesService],
  exports: [TypeOrmModule, CoachesService],
})
export class CoachesModule {}
