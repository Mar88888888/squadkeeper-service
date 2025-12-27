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
@Roles(UserRole.ADMIN)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.create(createGroupDto);
  }

  @Get()
  findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, updateGroupDto);
  }

  @Patch(':id/staff')
  updateStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGroupStaffDto: UpdateGroupStaffDto,
  ) {
    return this.groupsService.updateStaff(id, updateGroupStaffDto);
  }

  @Post(':id/players')
  addPlayers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignPlayersDto: AssignPlayersDto,
  ) {
    return this.groupsService.addPlayers(id, assignPlayersDto.playerIds);
  }

  @Delete(':id/players')
  removePlayers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignPlayersDto: AssignPlayersDto,
  ) {
    return this.groupsService.removePlayers(id, assignPlayersDto.playerIds);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.remove(id);
  }
}
