import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { TrainingsService } from './trainings.service';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { FilterTrainingsDto } from './dto/filter-trainings.dto';
import { TrainingResponseDto } from './dto/training-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { PermissionsService } from '../auth/permissions.service';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Serialize } from '../common/interceptors/serialize.interceptor';

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
  @Serialize(TrainingResponseDto)
  create(
    @Body() createTrainingDto: CreateTrainingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!this.permissionsService.checkGroupAccess(user, createTrainingDto.groupId)) {
      throw new ForbiddenException(
        'You can only create trainings for your own groups',
      );
    }
    return this.trainingsService.create(createTrainingDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @Serialize(TrainingResponseDto)
  findAll(@Query() filters: FilterTrainingsDto) {
    return this.trainingsService.findAll(filters);
  }

  @Get('my')
  @Roles(UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  @Serialize(TrainingResponseDto)
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
  @Serialize(TrainingResponseDto)
  findByGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!this.permissionsService.checkGroupAccess(user, groupId)) {
      throw new ForbiddenException(
        'You can only view trainings for your own groups',
      );
    }
    return this.trainingsService.findByGroup(groupId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  @Serialize(TrainingResponseDto)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const training = await this.trainingsService.findOne(id);

    if (!this.permissionsService.checkEventAccess(user, training)) {
      throw new ForbiddenException('You do not belong to this group');
    }

    return training;
  }

  @Patch(':id')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  @Serialize(TrainingResponseDto)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTrainingDto: UpdateTrainingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const training = await this.trainingsService.findOne(id);

    if (!this.permissionsService.checkEventAccess(user, training)) {
      throw new ForbiddenException(
        'You can only update trainings for your own groups',
      );
    }

    if (
      updateTrainingDto.groupId &&
      updateTrainingDto.groupId !== training.group.id &&
      !this.permissionsService.checkGroupAccess(user, updateTrainingDto.groupId)
    ) {
      throw new ForbiddenException(
        'You can only move trainings to your own groups',
      );
    }

    return this.trainingsService.update(id, updateTrainingDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.COACH, UserRole.ADMIN)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const training = await this.trainingsService.findOne(id);

    if (!this.permissionsService.checkEventAccess(user, training)) {
      throw new ForbiddenException(
        'You can only delete trainings for your own groups',
      );
    }

    return this.trainingsService.remove(id);
  }
}
