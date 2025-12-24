import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Training } from './entities/training.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Match, Training])],
  exports: [TypeOrmModule],
})
export class EventsModule {}
