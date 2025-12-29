import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { TrainingsService } from './trainings.service';
import { CreateTrainingDto } from './dto/create-training.dto';
import { FilterTrainingsDto } from './dto/filter-trainings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('trainings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  create(@Body() createTrainingDto: CreateTrainingDto) {
    return this.trainingsService.create(createTrainingDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Query() filters: FilterTrainingsDto) {
    return this.trainingsService.findAll(filters);
  }

  @Get('my')
  @Roles(UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  findMyTrainings(
    @Request() req: { user: { id: string; role: UserRole } },
    @Query() filters: FilterTrainingsDto,
  ) {
    return this.trainingsService.findMyTrainings(
      req.user.id,
      req.user.role,
      filters,
    );
  }

  @Get('group/:groupId')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  findByGroup(@Param('groupId') groupId: string) {
    return this.trainingsService.findByGroup(groupId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: UserRole } },
  ) {
    return this.trainingsService.findOneForUser(id, req.user.id, req.user.role);
  }
}
