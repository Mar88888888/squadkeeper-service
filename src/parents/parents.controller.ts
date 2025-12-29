import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('parents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get()
  findAll() {
    return this.parentsService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createParentDto: CreateParentDto) {
    return this.parentsService.create(createParentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.parentsService.remove(id);
  }

  @Post(':id/children/:playerId')
  @HttpCode(HttpStatus.OK)
  linkChild(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.parentsService.linkChild(id, playerId);
  }

  @Delete(':id/children/:playerId')
  @HttpCode(HttpStatus.OK)
  unlinkChild(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.parentsService.unlinkChild(id, playerId);
  }
}
