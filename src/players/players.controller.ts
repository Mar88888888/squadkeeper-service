import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { ChildrenStatsResponse } from './dto/player-stats.dto';
import { StatsPeriod } from '../common/enums/stats-period.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';

@Controller('players')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.playersService.findAll();
  }

  @Get('stats/my')
  @Roles(UserRole.PLAYER)
  async getMyStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: StatsPeriod,
  ) {
    const player = await this.playersService.findPlayerByUserId(user.id);
    return this.playersService.getPlayerStats(
      player.id,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Get('stats/team')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getTeamStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: StatsPeriod,
  ) {
    return this.playersService.getTeamStats(
      user.id,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Get('stats/children')
  @Roles(UserRole.PARENT)
  getChildrenStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: StatsPeriod,
  ): Promise<ChildrenStatsResponse> {
    return this.playersService.getChildrenStats(
      user.id,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Get('stats/:id')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getPlayerStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period?: StatsPeriod,
  ) {
    return this.playersService.getPlayerStats(
      id,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playersService.create(createPlayerDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePlayerDto: UpdatePlayerDto,
  ) {
    return this.playersService.update(id, updatePlayerDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.playersService.remove(id);
  }
}
