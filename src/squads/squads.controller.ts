import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Put,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { SquadsService } from './squads.service';
import { CreateSquadDto } from './dto/create-squad.dto';
import { UpdateSquadDto } from './dto/update-squad.dto';
import { UpdatePositionsDto } from './dto/update-positions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';

@Controller('squads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) {}

  @Post()
  @Roles(UserRole.COACH)
  create(
    @Body() createSquadDto: CreateSquadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.squadsService.create(createSquadDto, {
      userId: user.id,
      role: user.role,
    });
  }

  @Get('group/:groupId')
  @Roles(UserRole.COACH)
  findByGroup(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.squadsService.findByGroup(groupId);
  }

  @Get(':id')
  @Roles(UserRole.COACH)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.squadsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.COACH)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSquadDto: UpdateSquadDto,
  ) {
    return this.squadsService.update(id, updateSquadDto);
  }

  @Put(':id/positions')
  @Roles(UserRole.COACH)
  updatePositions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePositionsDto: UpdatePositionsDto,
  ) {
    return this.squadsService.updatePositions(id, updatePositionsDto);
  }

  @Post(':id/duplicate')
  @Roles(UserRole.COACH)
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('name') name: string,
  ) {
    return this.squadsService.duplicate(id, name);
  }

  @Delete(':id')
  @Roles(UserRole.COACH)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.squadsService.remove(id);
  }
}
