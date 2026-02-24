import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { Coach } from './entities/coach.entity';
import { hashPassword } from '../auth/utils/password.util';
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

  /**
   * Syncs name fields between Coach and User entities.
   * Names are stored in both for query convenience, this ensures consistency.
   */
  private syncPersonNames(
    coach: Coach,
    user: User,
    data: { firstName?: string; lastName?: string },
  ): void {
    if (data.firstName !== undefined) {
      coach.firstName = data.firstName;
      user.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      coach.lastName = data.lastName;
      user.lastName = data.lastName;
    }
  }

  async findAll(): Promise<Coach[]> {
    return this.coachesRepository.find({
      relations: ['user'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Coach> {
    const coach = await this.coachesRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!coach) {
      throw new NotFoundException(`Coach with ID ${id} not found`);
    }

    return coach;
  }

  async findByIds(ids: string[]): Promise<Coach[]> {
    if (ids.length === 0) return [];

    const coaches = await this.coachesRepository.find({
      where: { id: In(ids) },
      relations: ['user'],
    });

    if (coaches.length !== ids.length) {
      const foundIds = new Set(coaches.map((c) => c.id));
      const missingIds = ids.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Coaches with IDs ${missingIds.join(', ')} not found`,
      );
    }

    return coaches;
  }

  async remove(id: string): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const coach = await manager.findOne(Coach, {
          where: { id },
          relations: ['user'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!coach) return;

        const userId = coach.user?.id;

        await manager.remove(coach);

        if (userId) {
          await manager.delete(User, userId);
        }
      });
    } catch (error) {
      this.logger.error('Failed to delete coach', error);
      throw new InternalServerErrorException(`Failed to delete coach: ${error.message}`);
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

        const hashedPassword = await hashPassword(createCoachDto.password);

        const user = manager.create(User, {
          email: createCoachDto.email,
          passwordHash: hashedPassword,
          role: UserRole.COACH,
        });

        const coach = manager.create(Coach, {
          licenseLevel: createCoachDto.licenseLevel,
          experienceYears: createCoachDto.experienceYears,
          phoneNumber: createCoachDto.phoneNumber,
          dateOfBirth: new Date(createCoachDto.dateOfBirth),
          user,
        });

        this.syncPersonNames(coach, user, {
          firstName: createCoachDto.firstName,
          lastName: createCoachDto.lastName,
        });

        await manager.save(user);
        await manager.save(coach);

        return coach;
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Failed to create coach', error);
      throw new InternalServerErrorException(`Failed to create coach: ${error.message}`);
    }
  }

  async update(id: string, updateCoachDto: UpdateCoachDto): Promise<Coach> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const coach = await manager.findOne(Coach, {
          where: { id },
          relations: ['user'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!coach) {
          throw new NotFoundException('Coach not found');
        }

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
            coach.user.passwordHash = await hashPassword(password);
          }
        }

        this.syncPersonNames(coach, coach.user, { firstName, lastName });

        if (updateCoachDto.phoneNumber !== undefined) coach.phoneNumber = updateCoachDto.phoneNumber;
        if (updateCoachDto.dateOfBirth !== undefined) coach.dateOfBirth = new Date(updateCoachDto.dateOfBirth);
        if (updateCoachDto.licenseLevel !== undefined) coach.licenseLevel = updateCoachDto.licenseLevel;
        if (updateCoachDto.experienceYears !== undefined) coach.experienceYears = updateCoachDto.experienceYears;

        await manager.save([coach.user, coach]);

        return coach;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ConflictException) throw error;
      this.logger.error('Failed to update coach', error);
      throw new InternalServerErrorException(`Failed to update coach: ${error.message}`);
    }
  }
}
