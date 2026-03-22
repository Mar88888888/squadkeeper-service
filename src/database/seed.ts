import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DataSeedService } from './data-seed.service';
import { Coach } from '../coaches/entities/coach.entity';
import { Group } from '../groups/entities/group.entity';
import { Parent } from '../parents/entities/parent.entity';
import { Player } from '../players/entities/player.entity';
import { Training } from '../events/entities/training.entity';
import { TrainingSchedule } from '../events/entities/training-schedule.entity';
import { Match } from '../events/entities/match.entity';
import { Goal } from '../events/entities/goal.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Squad } from '../squads/entities/squad.entity';
import { SquadPosition } from '../squads/entities/squad-position.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres' as const,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT!, 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [
          Coach,
          Group,
          Parent,
          Player,
          Training,
          TrainingSchedule,
          Match,
          Goal,
          Attendance,
          Evaluation,
          Squad,
          SquadPosition,
          User,
        ],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([
      Coach,
      Group,
      Parent,
      Player,
      Training,
      Match,
      Goal,
      Attendance,
      Evaluation,
      User,
    ]),
  ],
  providers: [DataSeedService],
})
class SeedModule {}

async function bootstrap() {
  // Production guard
  if (process.env.NODE_ENV === 'production') {
    console.log('❌ Seeding is disabled in production environment');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(SeedModule);

  const seedService = app.get(DataSeedService);

  try {
    await seedService.seed();
    console.log('\n✨ Seeding process completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
