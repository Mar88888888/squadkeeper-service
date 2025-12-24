import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coach } from './entities/coach.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Coach])],
  exports: [TypeOrmModule],
})
export class CoachesModule {}
