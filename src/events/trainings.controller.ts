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
  ForbiddenException,
} from '@nestjs/common';
import { TrainingsService } from './trainings.service';
import { CreateTrainingDto } from './dto/create-training.dto';
import { FilterTrainingsDto } from './dto/filter-trainings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { PermissionsService } from '../auth/permissions.service';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('trainings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainingsController {
  constructor(
    private readonly trainingsService: TrainingsService,
    private readonly permissionsService: PermissionsService,
  ) {}

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
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterTrainingsDto,
  ) {
    return this.trainingsService.findMyTrainings(
      user.groupIds,
      user.role,
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
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const training = await this.trainingsService.findOne(id);

    if (!this.permissionsService.checkTrainingAccess(user, training)) {
      throw new ForbiddenException('You do not belong to this group');
    }

    return training;
  }
}
