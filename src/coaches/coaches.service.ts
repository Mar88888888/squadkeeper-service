import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Coach } from './entities/coach.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateCoachDto } from './dto/create-coach.dto';

@Injectable()
export class CoachesService {
  constructor(
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userId = coach.user?.id;

      // First, break the bidirectional reference from User to Coach
      if (userId) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(User)
          .set({ coach: null as unknown as Coach })
          .where('id = :userId', { userId })
          .execute();
      }

      // Now we can safely remove the coach
      await queryRunner.manager.remove(coach);

      // Finally delete the user
      if (userId) {
        await queryRunner.manager.delete(User, userId);
      }

      await queryRunner.commitTransaction();
    } catch {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Failed to delete coach');
    } finally {
      await queryRunner.release();
    }
  }

  async create(createCoachDto: CreateCoachDto): Promise<Coach> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if email already exists
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: createCoachDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createCoachDto.password, 10);

      // Create User
      const user = queryRunner.manager.create(User, {
        email: createCoachDto.email,
        passwordHash: hashedPassword,
        role: UserRole.COACH,
        firstName: createCoachDto.firstName,
        lastName: createCoachDto.lastName,
      });

      await queryRunner.manager.save(user);

      // Create Coach Profile
      const coach = queryRunner.manager.create(Coach, {
        licenseLevel: createCoachDto.licenseLevel,
        experienceYears: createCoachDto.experienceYears,
        firstName: createCoachDto.firstName,
        lastName: createCoachDto.lastName,
        phoneNumber: createCoachDto.phoneNumber,
        dateOfBirth: new Date(createCoachDto.dateOfBirth),
        user,
      });

      await queryRunner.manager.save(coach);

      // Link User to Coach
      user.coach = coach;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      return coach;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create coach');
    } finally {
      await queryRunner.release();
    }
  }
}
