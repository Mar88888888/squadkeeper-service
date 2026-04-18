import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ParentsModule } from './parents/parents.module';
import { CoachesModule } from './coaches/coaches.module';
import { PlayersModule } from './players/players.module';
import { GroupsModule } from './groups/groups.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ContactsModule } from './contacts/contacts.module';
import { SquadsModule } from './squads/squads.module';
import { DatabaseModule } from './database/database.module';
import { ObjectivesModule } from './objectives/objectives.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const requiredEnvVars = [
          'DB_HOST',
          'DB_PORT',
          'DB_USERNAME',
          'DB_PASSWORD',
          'DB_NAME',
        ];
        const missing = requiredEnvVars.filter((v) => !process.env[v]);
        if (missing.length > 0) {
          throw new Error(
            `Missing required environment variables: ${missing.join(', ')}`,
          );
        }

        return {
          type: 'postgres',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT!, 10),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    UsersModule,
    ParentsModule,
    CoachesModule,
    PlayersModule,
    GroupsModule,
    EvaluationsModule,
    EventsModule,
    AuthModule,
    AttendanceModule,
    ContactsModule,
    SquadsModule,
    DatabaseModule,
    ObjectivesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
