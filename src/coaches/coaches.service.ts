import {
  Injectable,
  ConflictException,
  BadRequestException,
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
