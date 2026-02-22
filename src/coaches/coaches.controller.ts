import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CoachesService } from './coaches.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { CoachResponseDto } from './dto/coach-response.dto';
import { Coach } from './entities/coach.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('coaches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) {}

  private toResponseDto(coach: Coach): CoachResponseDto {
    return {
      id: coach.id,
      firstName: coach.firstName,
      lastName: coach.lastName,
      email: coach.user?.email ?? '',
      phoneNumber: coach.phoneNumber ?? null,
      dateOfBirth: coach.dateOfBirth?.toISOString().split('T')[0] ?? null,
      licenseLevel: coach.licenseLevel,
      experienceYears: coach.experienceYears,
    };
  }

  @Get()
  async findAll(): Promise<CoachResponseDto[]> {
    const coaches = await this.coachesService.findAll();
    return coaches.map((coach) => this.toResponseDto(coach));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCoachDto: CreateCoachDto): Promise<CoachResponseDto> {
    const coach = await this.coachesService.create(createCoachDto);
    return this.toResponseDto(coach);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCoachDto: UpdateCoachDto,
  ): Promise<CoachResponseDto> {
    const coach = await this.coachesService.update(id, updateCoachDto);
    return this.toResponseDto(coach);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coachesService.remove(id);
  }
}
