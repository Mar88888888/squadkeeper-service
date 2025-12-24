import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Evaluation])],
  exports: [TypeOrmModule],
})
export class EvaluationsModule {}
