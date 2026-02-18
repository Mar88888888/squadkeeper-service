import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ApplyScheduleDto } from './dto/schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('groups/:groupId/schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COACH)
  getSchedule(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.scheduleService.getSchedule(groupId);
  }

  @Get('preview')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  getTrainingsInRange(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.scheduleService.getTrainingsInRange(groupId, fromDate, toDate);
  }

  @Put()
  @Roles(UserRole.ADMIN, UserRole.COACH)
  applySchedule(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: ApplyScheduleDto,
  ) {
    return this.scheduleService.applySchedule(groupId, dto);
  }
}
