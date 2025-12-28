import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationBatchDto } from './dto/create-evaluation-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post('batch')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  @HttpCode(HttpStatus.OK)
  createBatch(
    @Body() dto: CreateEvaluationBatchDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.evaluationsService.createBatch(dto, req.user.id);
  }

  @Get('training/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH)
  getByTraining(@Param('id') id: string) {
    return this.evaluationsService.findByTraining(id);
  }

  @Get('player/:id')
  @Roles(UserRole.ADMIN, UserRole.COACH, UserRole.PLAYER, UserRole.PARENT)
  getByPlayer(@Param('id') id: string) {
    return this.evaluationsService.findByPlayer(id);
  }
}
