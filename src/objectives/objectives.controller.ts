import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ObjectivesService } from './objectives.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';
import { Serialize } from '../common/interceptors/serialize.interceptor';
import { CreateObjectiveDto } from './dto/create-objective.dto';
import { CreateGroupObjectiveDto } from './dto/create-group-objective.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';
import { ObjectiveResponseDto } from './dto/objective-response.dto';
import { ObjectiveSummaryResponseDto } from './dto/objective-summary-response.dto';

@Controller('objectives')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ObjectivesController {
  constructor(private readonly objectivesService: ObjectivesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COACH)
  @Serialize(ObjectiveResponseDto)
  create(
    @Body() dto: CreateObjectiveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.objectivesService.create(dto, user);
  }

  @Post('group/:groupId')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  @Serialize(ObjectiveResponseDto)
  createForGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CreateGroupObjectiveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.objectivesService.createForGroup(groupId, dto, user);
  }

  @Get('my')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  @Serialize(ObjectiveResponseDto)
  findMy(@CurrentUser() user: AuthenticatedUser) {
    return this.objectivesService.findMy(user);
  }

  @Get('summary/my')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  @Serialize(ObjectiveSummaryResponseDto)
  getMySummary(@CurrentUser() user: AuthenticatedUser) {
    return this.objectivesService.getSummaryForMy(user);
  }

  @Get('player/:playerId')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  @Serialize(ObjectiveResponseDto)
  findByPlayer(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.objectivesService.findByPlayerForUser(playerId, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  @Serialize(ObjectiveResponseDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateObjectiveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.objectivesService.update(id, dto, user);
  }
}
