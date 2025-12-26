import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {
  MarkAttendanceBatchDto,
  EventType,
} from './dto/mark-attendance-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COACH)
  @HttpCode(HttpStatus.OK)
  markBatch(@Body() dto: MarkAttendanceBatchDto) {
    return this.attendanceService.markBatch(dto);
  }

  @Get('training/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COACH)
  getTrainingAttendance(@Param('id') id: string) {
    return this.attendanceService.findByEvent(id, EventType.TRAINING);
  }

  @Get('match/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COACH)
  getMatchAttendance(@Param('id') id: string) {
    return this.attendanceService.findByEvent(id, EventType.MATCH);
  }
}
