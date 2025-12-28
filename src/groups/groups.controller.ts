import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateGroupStaffDto } from './dto/update-group-staff.dto';
import { AssignPlayersDto } from './dto/assign-players.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.create(createGroupDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.groupsService.findAll();
  }

  @Get('my')
  @Roles(UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  findMyGroups(@Request() req: { user: { id: string; role: UserRole } }) {
    return this.groupsService.findMyGroups(req.user.id, req.user.role);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, updateGroupDto);
  }

  @Patch(':id/staff')
  @Roles(UserRole.ADMIN)
  updateStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGroupStaffDto: UpdateGroupStaffDto,
  ) {
    return this.groupsService.updateStaff(id, updateGroupStaffDto);
  }

  @Post(':id/players')
  @Roles(UserRole.ADMIN)
  addPlayers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignPlayersDto: AssignPlayersDto,
  ) {
    return this.groupsService.addPlayers(id, assignPlayersDto.playerIds);
  }

  @Delete(':id/players')
  @Roles(UserRole.ADMIN)
  removePlayers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignPlayersDto: AssignPlayersDto,
  ) {
    return this.groupsService.removePlayers(id, assignPlayersDto.playerIds);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.remove(id);
  }
}
