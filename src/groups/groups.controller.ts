import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupStaffDto } from './dto/update-group-staff.dto';
import { AssignPlayersDto } from './dto/assign-players.dto';

@Controller('groups')
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

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.remove(id);
  }
}
