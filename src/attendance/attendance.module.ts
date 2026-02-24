import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Attendance } from './entities/attendance.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, Evaluation, Training, Match])],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
