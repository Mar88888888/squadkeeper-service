import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Attendance } from './entities/attendance.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';
import { AuthModule } from '../auth/auth.module';
import { ObjectivesModule } from '../objectives/objectives.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, Training, Match]),
    AuthModule,
    ObjectivesModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
