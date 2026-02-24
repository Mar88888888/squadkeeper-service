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
} from '@nestjs/common';
import { PlayersService } from './players.service';
import { PlayerStatsService } from './player-stats.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayerResponseDto } from './dto/player-response.dto';
import { ChildrenStatsResponse } from './dto/player-stats.dto';
import { StatsPeriod } from '../common/enums/stats-period.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/dto/authenticated-user.dto';
import { Serialize } from '../common/interceptors/serialize.interceptor';

@Controller('players')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly playerStatsService: PlayerStatsService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @Serialize(PlayerResponseDto)
  findAll() {
    return this.playersService.findAll();
  }

  @Get('stats/my')
  @Roles(UserRole.PLAYER)
  getMyStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: StatsPeriod,
  ) {
    return this.playerStatsService.getPlayerStats(
      user.playerId!,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Get('stats/team')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getTeamStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: StatsPeriod,
  ) {
    return this.playerStatsService.getTeamStats(
      user.groupIds,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Get('stats/children')
  @Roles(UserRole.PARENT)
  getChildrenStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: StatsPeriod,
  ): Promise<ChildrenStatsResponse> {
    const childrenIds = user.children?.map((c) => c.id) || [];
    return this.playerStatsService.getChildrenStats(
      childrenIds,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Get('stats/:id')
  @Roles(UserRole.COACH, UserRole.ADMIN)
  getPlayerStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period?: StatsPeriod,
  ) {
    return this.playerStatsService.getPlayerStats(
      id,
      period || StatsPeriod.ALL_TIME,
    );
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @Serialize(PlayerResponseDto)
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playersService.create(createPlayerDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @Serialize(PlayerResponseDto)
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
