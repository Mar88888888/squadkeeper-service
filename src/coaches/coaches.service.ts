import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Coach } from './entities/coach.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';

@Injectable()
export class CoachesService {
  private readonly logger = new Logger(CoachesService.name);

  constructor(
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
    private dataSource: DataSource,
  ) {}

  async findAll(): Promise<Coach[]> {
    return this.coachesRepository.find({
      relations: ['user'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async remove(id: string): Promise<void> {
    const coach = await this.coachesRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!coach) {
      throw new NotFoundException('Coach not found');
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        const userId = coach.user?.id;

        if (userId) {
          await manager
            .createQueryBuilder()
            .update(User)
            .set({ coach: null as unknown as Coach })
            .where('id = :userId', { userId })
            .execute();
        }

        await manager.remove(coach);

        if (userId) {
          await manager.delete(User, userId);
        }
      });
    } catch (error) {
      this.logger.error('Failed to delete coach', error);
      throw new BadRequestException('Failed to delete coach');
    }
  }

  async create(createCoachDto: CreateCoachDto): Promise<Coach> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existingUser = await manager.findOne(User, {
          where: { email: createCoachDto.email },
        });

        if (existingUser) {
          throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(createCoachDto.password, 10);

        const user = manager.create(User, {
          email: createCoachDto.email,
          passwordHash: hashedPassword,
          role: UserRole.COACH,
          firstName: createCoachDto.firstName,
          lastName: createCoachDto.lastName,
        });

        await manager.save(user);

        const coach = manager.create(Coach, {
          licenseLevel: createCoachDto.licenseLevel,
          experienceYears: createCoachDto.experienceYears,
          firstName: createCoachDto.firstName,
          lastName: createCoachDto.lastName,
          phoneNumber: createCoachDto.phoneNumber,
          dateOfBirth: new Date(createCoachDto.dateOfBirth),
          user,
        });

        await manager.save(coach);

        user.coach = coach;
        await manager.save(user);

        return coach;
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Failed to create coach', error);
      throw new BadRequestException('Failed to create coach');
    }
  }

  async update(id: string, updateCoachDto: UpdateCoachDto): Promise<Coach> {
    const coach = await this.coachesRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!coach) {
      throw new NotFoundException('Coach not found');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const { email, password, firstName, lastName } = updateCoachDto;

        if (coach.user) {
          if (email !== undefined && email !== coach.user.email) {
            const existingUser = await manager.findOne(User, { where: { email } });
            if (existingUser) {
              throw new ConflictException('Email already exists');
            }
            coach.user.email = email;
          }

          if (password !== undefined) {
            coach.user.passwordHash = await bcrypt.hash(password, 10);
          }
          if (firstName !== undefined) coach.user.firstName = firstName;
          if (lastName !== undefined) coach.user.lastName = lastName;

          await manager.save(coach.user);
        }

        if (firstName !== undefined) coach.firstName = firstName;
        if (lastName !== undefined) coach.lastName = lastName;
        if (updateCoachDto.phoneNumber !== undefined) coach.phoneNumber = updateCoachDto.phoneNumber;
        if (updateCoachDto.dateOfBirth !== undefined) coach.dateOfBirth = new Date(updateCoachDto.dateOfBirth);
        if (updateCoachDto.licenseLevel !== undefined) coach.licenseLevel = updateCoachDto.licenseLevel;
        if (updateCoachDto.experienceYears !== undefined) coach.experienceYears = updateCoachDto.experienceYears;

        await manager.save(coach);

        return coach;
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error('Failed to update coach', error);
      throw new BadRequestException('Failed to update coach');
    }
  }
}
