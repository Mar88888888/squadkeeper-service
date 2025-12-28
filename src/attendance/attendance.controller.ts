import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceService } from './attendance.service';
import {
  MarkAttendanceBatchDto,
  EventType,
} from './dto/mark-attendance-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Player } from '../players/entities/player.entity';
import { Parent } from '../parents/entities/parent.entity';
import { Training } from '../events/entities/training.entity';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(Parent)
    private parentsRepository: Repository<Parent>,
    @InjectRepository(Training)
    private trainingsRepository: Repository<Training>,
  ) {}

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
  async getTrainingAttendance(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: UserRole } },
  ) {
    const { id: userId, role } = req.user;

    // Admins and coaches see all attendance
    if (role === UserRole.ADMIN || role === UserRole.COACH) {
      return this.attendanceService.findByEvent(id, EventType.TRAINING);
    }

    // Get the training to verify access
    const training = await this.trainingsRepository.findOne({
      where: { id },
      relations: ['group'],
    });
    if (!training) {
      throw new ForbiddenException('Training not found');
    }

    // Players only see their own attendance
    if (role === UserRole.PLAYER) {
      const player = await this.playersRepository.findOne({
        where: { user: { id: userId } },
        relations: ['group'],
      });
      if (!player || player.group?.id !== training.group.id) {
        throw new ForbiddenException('You do not have access to this training');
      }
      return this.attendanceService.findByEventForPlayers(id, EventType.TRAINING, [player.id]);
    }

    // Parents see their children's attendance
    if (role === UserRole.PARENT) {
      const parent = await this.parentsRepository.findOne({
        where: { user: { id: userId } },
        relations: ['children', 'children.group'],
      });
      const childrenInGroup = parent?.children?.filter(
        (child) => child.group?.id === training.group.id,
      ) || [];
      if (childrenInGroup.length === 0) {
        throw new ForbiddenException('You do not have access to this training');
      }
      const childIds = childrenInGroup.map((c) => c.id);
      return this.attendanceService.findByEventForPlayers(id, EventType.TRAINING, childIds);
    }

    throw new ForbiddenException('Access denied');
  }

  @Get('match/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COACH)
  getMatchAttendance(@Param('id') id: string) {
    return this.attendanceService.findByEvent(id, EventType.MATCH);
  }

  @Get('my/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLAYER, UserRole.PARENT)
  async getMyStats(@Request() req: { user: { id: string; role: UserRole } }) {
    const { id: userId, role } = req.user;

    if (role === UserRole.PLAYER) {
      const player = await this.playersRepository.findOne({
        where: { user: { id: userId } },
      });
      if (!player) {
        throw new ForbiddenException('Player profile not found');
      }
      return this.attendanceService.getPlayerStats([player.id]);
    }

    if (role === UserRole.PARENT) {
      const parent = await this.parentsRepository.findOne({
        where: { user: { id: userId } },
        relations: ['children'],
      });
      if (!parent || !parent.children?.length) {
        throw new ForbiddenException('No children found');
      }
      const childIds = parent.children.map((c) => c.id);
      return this.attendanceService.getPlayerStats(childIds);
    }

    throw new ForbiddenException('Access denied');
  }
}
