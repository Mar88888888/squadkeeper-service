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
import { MarkAttendanceBatchDto } from './dto/mark-attendance-batch.dto';
import { EventType } from '../events/enums/event-type.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  getTrainingAttendance(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getEventAttendanceForUser(
      id,
      EventType.TRAINING,
      user.role,
      user.groupIds,
      user.playerId,
      user.children,
    );
  }

  @Get('match/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  getMatchAttendance(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getEventAttendanceForUser(
      id,
      EventType.MATCH,
      user.role,
      user.groupIds,
      user.playerId,
      user.children,
    );
  }

  @Get('my/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLAYER)
  getMyStats(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.getPlayerStats([user.playerId!]);
  }

  @Get('my/children/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  getChildrenStats(@CurrentUser() user: AuthenticatedUser) {
    const childIds = user.children?.map((c) => c.id) ?? [];
    return this.attendanceService.getStatsPerPlayer(childIds);
  }
}
