import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { UpdateScheduleDto, GenerateTrainingsDto } from './dto/schedule.dto';
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

  @Put()
  @Roles(UserRole.ADMIN, UserRole.COACH)
  updateSchedule(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.scheduleService.updateSchedule(groupId, dto);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.COACH)
  generateTrainings(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: GenerateTrainingsDto,
  ) {
    return this.scheduleService.generateTrainings(groupId, dto);
  }

  @Delete('trainings')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  deleteFutureGeneratedTrainings(
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.scheduleService.deleteFutureGeneratedTrainings(groupId);
  }
}
