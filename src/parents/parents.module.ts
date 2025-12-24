import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parent])],
  exports: [TypeOrmModule],
})
export class ParentsModule {}
