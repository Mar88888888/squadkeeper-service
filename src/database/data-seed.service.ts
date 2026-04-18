import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Coach } from '../coaches/entities/coach.entity';
import { Group } from '../groups/entities/group.entity';
import { Parent } from '../parents/entities/parent.entity';
import { Player } from '../players/entities/player.entity';
import { Training } from '../events/entities/training.entity';
import { Match } from '../events/entities/match.entity';
import { Goal } from '../events/entities/goal.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { User } from '../users/entities/user.entity';
import { LicenseLevel } from '../coaches/dto/create-coach.dto';
import { Position } from '../players/enums/position.enum';
import { StrongFoot } from '../players/enums/strong-foot.enum';
import { MatchType } from '../events/enums/match-type.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { hashPassword } from '../auth/utils/password.util';

@Injectable()
export class DataSeedService {
  constructor(
    @InjectRepository(Coach)
    private coachRepository: Repository<Coach>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(Parent)
    private parentRepository: Repository<Parent>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(Training)
    private trainingRepository: Repository<Training>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Goal)
    private goalRepository: Repository<Goal>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Evaluation)
    private evaluationRepository: Repository<Evaluation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async seed() {
    console.log('🌱 Starting database seeding...');

    // Production guard
    if (process.env.NODE_ENV === 'production') {
      console.log('❌ Seeding is disabled in production environment');
      return;
    }

    // Hash password once for all test accounts
    const testPassword = await hashPassword('Test1234');
    console.log('🔑 Test password for all accounts: Test1234');

    await this.cleanDatabase();

    const coaches = await this.seedCoaches(testPassword);
    console.log(`✅ Created ${coaches.length} coaches with user accounts`);

    const groups = await this.seedGroups(coaches);
    console.log(`✅ Created ${groups.length} groups`);

    const parents = await this.seedParents(testPassword);
    console.log(`✅ Created ${parents.length} parents with user accounts`);

    const players = await this.seedPlayers(parents, groups, testPassword);
    console.log(`✅ Created ${players.length} players with user accounts`);

    const { pastTrainings, futureTrainings } = await this.seedTrainings(groups);
    console.log(
      `✅ Created ${pastTrainings.length} past trainings and ${futureTrainings.length} future trainings`,
    );

    const { pastMatches, futureMatches } = await this.seedMatches(groups);
    console.log(
      `✅ Created ${pastMatches.length} past matches and ${futureMatches.length} future matches`,
    );

    const attendances = await this.seedAttendances(
      players,
      pastTrainings,
      pastMatches,
      groups,
    );
    console.log(`✅ Created ${attendances.length} attendance records`);

    const goals = await this.seedGoals(pastMatches, attendances);
    console.log(`✅ Created ${goals.length} goals`);

    const evaluationsCount = await this.seedEvaluations(attendances, groups);
    console.log(`✅ Created ${evaluationsCount} evaluations`);

    console.log('\n📋 Test Account Summary:');
    console.log('  Password for all accounts: Test1234');
    console.log(
      `  Coaches: coach1@test.com, coach2@test.com, ... coach5@test.com`,
    );
    console.log(
      `  Players: player1@test.com, player2@test.com, ... player100@test.com`,
    );
    console.log(
      `  Parents: parent1@test.com, parent2@test.com, ... parent60@test.com`,
    );

    console.log('🎉 Database seeding completed successfully!');
  }

  private async cleanDatabase() {
    console.log('🧹 Cleaning existing data...');
    // Delete in correct order respecting foreign key constraints
    // Children first, then parents

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Disable foreign key checks temporarily for faster deletion
      await queryRunner.query('SET session_replication_role = replica;');

      // Truncate all tables
      await queryRunner.query('TRUNCATE TABLE "evaluations" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "attendances" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "goals" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "matches" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "trainings" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "squad_positions" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "squads" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "players" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "groups" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "parents" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "coaches" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "users" CASCADE;');

      // Re-enable foreign key checks
      await queryRunner.query('SET session_replication_role = DEFAULT;');
    } finally {
      await queryRunner.release();
    }
  }

  private async seedCoaches(hashedPassword: string): Promise<Coach[]> {
    const coaches: Coach[] = [];
    const licenseLevels = Object.values(LicenseLevel);

    for (let i = 0; i < 5; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = `coach${i + 1}@test.com`;

      // Create user first
      const user = this.userRepository.create({
        email,
        passwordHash: hashedPassword,
        role: UserRole.COACH,
        firstName,
        lastName,
      });

      const coach = this.coachRepository.create({
        firstName,
        lastName,
        phoneNumber: faker.phone.number(),
        dateOfBirth: faker.date.birthdate({ min: 25, max: 65, mode: 'age' }),
        licenseLevel: faker.helpers.arrayElement(licenseLevels),
        experienceYears: faker.number.int({ min: 1, max: 30 }),
        user,
      });
      coaches.push(coach);
    }

    // Save users first, then coaches
    await this.userRepository.save(coaches.map((c) => c.user));
    return await this.coachRepository.save(coaches);
  }

  private async seedGroups(coaches: Coach[]): Promise<Group[]> {
    const groups: Group[] = [];
    const currentYear = new Date().getFullYear();

    const groupNames = [
      'U8 Eagles',
      'U10 Lions',
      'U12 Tigers',
      'U14 Wolves',
      'U16 Panthers',
      'U8 Hawks',
      'U10 Falcons',
      'U12 Sharks',
      'U14 Bears',
      'U16 Dragons',
    ];

    for (let i = 0; i < 10; i++) {
      const yearOfBirth = currentYear - 8 - i;
      const group = this.groupRepository.create({
        name: groupNames[i],
        yearOfBirth,
        headCoach: faker.helpers.arrayElement(coaches),
      });
      groups.push(group);
    }

    return await this.groupRepository.save(groups);
  }

  private async seedParents(hashedPassword: string): Promise<Parent[]> {
    const parents: Parent[] = [];

    for (let i = 0; i < 60; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = `parent${i + 1}@test.com`;

      // Create user first
      const user = this.userRepository.create({
        email,
        passwordHash: hashedPassword,
        role: UserRole.PARENT,
        firstName,
        lastName,
      });

      const parent = this.parentRepository.create({
        firstName,
        lastName,
        phoneNumber: faker.phone.number(),
        dateOfBirth: faker.date.birthdate({ min: 30, max: 55, mode: 'age' }),
        user,
      });
      parents.push(parent);
    }

    // Save users first, then parents
    await this.userRepository.save(parents.map((p) => p.user));
    return await this.parentRepository.save(parents);
  }

  private async seedPlayers(
    parents: Parent[],
    groups: Group[],
    hashedPassword: string,
  ): Promise<Player[]> {
    const players: Player[] = [];
    const positions = Object.values(Position);
    const strongFoots = Object.values(StrongFoot);

    // Track how many children each parent has (1-3)
    const parentChildrenCount = new Map<string, number>();
    parents.forEach((parent) => {
      parentChildrenCount.set(parent.id, faker.number.int({ min: 1, max: 3 }));
    });

    const totalPlayersToCreate = 100;
    let playersCreated = 0;

    // Assign children to parents
    for (const parent of parents) {
      const childrenCount = parentChildrenCount.get(parent.id) || 1;

      for (
        let i = 0;
        i < childrenCount && playersCreated < totalPlayersToCreate;
        i++
      ) {
        const firstName = faker.person.firstName();
        const lastName = parent.lastName; // Use parent's last name
        const email = `player${playersCreated + 1}@test.com`;

        // Create user first
        const user = this.userRepository.create({
          email,
          passwordHash: hashedPassword,
          role: UserRole.PLAYER,
          firstName,
          lastName,
        });

        const player = this.playerRepository.create({
          firstName,
          lastName,
          phoneNumber: faker.phone.number(),
          dateOfBirth: faker.date.birthdate({ min: 6, max: 16, mode: 'age' }),
          position: faker.helpers.arrayElement(positions),
          height: faker.number.float({ min: 120, max: 185, fractionDigits: 2 }),
          weight: faker.number.float({ min: 25, max: 80, fractionDigits: 2 }),
          strongFoot: faker.helpers.arrayElement(strongFoots),
          parent,
          group: faker.helpers.arrayElement(groups),
          user,
        });
        players.push(player);
        playersCreated++;
      }

      if (playersCreated >= totalPlayersToCreate) break;
    }

    // Save users first, then players
    await this.userRepository.save(players.map((p) => p.user));
    return await this.playerRepository.save(players);
  }

  private async seedTrainings(groups: Group[]): Promise<{
    pastTrainings: Training[];
    futureTrainings: Training[];
  }> {
    const pastTrainings: Training[] = [];
    const futureTrainings: Training[] = [];

    const now = new Date();
    const pastStartDate = new Date(now);
    pastStartDate.setDate(pastStartDate.getDate() - 90); // Last 90 days

    const futureEndDate = new Date(now);
    futureEndDate.setDate(futureEndDate.getDate() + 14); // Next 14 days

    const locations = [
      'Main Field A',
      'Main Field B',
      'Training Ground 1',
      'Training Ground 2',
      'Indoor Facility',
    ];

    const topics = [
      'Ball Control',
      'Passing & Movement',
      'Shooting Practice',
      'Tactical Positioning',
      'Small-Sided Games',
      'Fitness & Conditioning',
      'Set Pieces',
      'Defensive Drills',
    ];

    for (const group of groups) {
      // Past trainings: 3 per week for 90 days = ~39 trainings
      const totalPastWeeks = 13; // ~90 days / 7
      for (let week = 0; week < totalPastWeeks; week++) {
        for (let day = 0; day < 3; day++) {
          // Mon, Wed, Fri typically
          const daysFromStart = week * 7 + day * 2;
          const trainingDate = new Date(pastStartDate);
          trainingDate.setDate(trainingDate.getDate() + daysFromStart);

          // Set training time to 17:00 (5 PM)
          trainingDate.setHours(17, 0, 0, 0);

          const training = this.trainingRepository.create({
            startTime: trainingDate,
            durationMinutes: 90,
            location: faker.helpers.arrayElement(locations),
            topic: faker.helpers.arrayElement(topics),
            group,
          });
          pastTrainings.push(training);
        }
      }

      // Future trainings: 3 per week for 2 weeks = 6 trainings
      const totalFutureWeeks = 2;
      for (let week = 0; week < totalFutureWeeks; week++) {
        for (let day = 0; day < 3; day++) {
          const daysFromNow = week * 7 + day * 2 + 1;
          const trainingDate = new Date(now);
          trainingDate.setDate(trainingDate.getDate() + daysFromNow);
          trainingDate.setHours(17, 0, 0, 0);

          const training = this.trainingRepository.create({
            startTime: trainingDate,
            durationMinutes: 90,
            location: faker.helpers.arrayElement(locations),
            topic: faker.helpers.arrayElement(topics),
            group,
          });
          futureTrainings.push(training);
        }
      }
    }

    const savedPastTrainings =
      await this.trainingRepository.save(pastTrainings);
    const savedFutureTrainings =
      await this.trainingRepository.save(futureTrainings);

    return {
      pastTrainings: savedPastTrainings,
      futureTrainings: savedFutureTrainings,
    };
  }

  private async seedMatches(groups: Group[]): Promise<{
    pastMatches: Match[];
    futureMatches: Match[];
  }> {
    const pastMatches: Match[] = [];
    const futureMatches: Match[] = [];

    const now = new Date();
    const pastStartDate = new Date(now);
    pastStartDate.setDate(pastStartDate.getDate() - 90);

    const locations = [
      'Home Stadium',
      'Training Ground Main',
      'City Sports Complex',
      'Opponents Stadium',
      'Regional Arena',
    ];

    const opponents = [
      'FC United',
      'City Rovers',
      'Athletic Stars',
      'Sports Academy',
      'Youth FC',
      'Junior Rangers',
      'Elite Academy',
      'Victory Sports',
      'Champions United',
      'Premier Youth',
    ];

    const matchTypes = Object.values(MatchType);

    for (const group of groups) {
      // Past matches: 1 per weekend for 90 days = ~13 matches
      const totalPastWeekends = 13;
      for (let weekend = 0; weekend < totalPastWeekends; weekend++) {
        const daysFromStart = weekend * 7 + 6; // Saturdays
        const matchDate = new Date(pastStartDate);
        matchDate.setDate(matchDate.getDate() + daysFromStart);
        matchDate.setHours(10, 0, 0, 0); // 10 AM

        const isHome = faker.datatype.boolean();
        const homeGoals = faker.number.int({ min: 0, max: 5 });
        const awayGoals = faker.number.int({ min: 0, max: 5 });

        const match = this.matchRepository.create({
          startTime: matchDate,
          durationMinutes: 90,
          location: faker.helpers.arrayElement(locations),
          opponent: faker.helpers.arrayElement(opponents),
          isHome,
          matchType: faker.helpers.arrayElement(matchTypes),
          homeGoals,
          awayGoals,
          group,
        });
        pastMatches.push(match);
      }

      // Future matches: 1 per weekend for 2 weeks = 2 matches
      for (let weekend = 0; weekend < 2; weekend++) {
        const daysFromNow = weekend * 7 + 6;
        const matchDate = new Date(now);
        matchDate.setDate(matchDate.getDate() + daysFromNow);
        matchDate.setHours(10, 0, 0, 0);

        const isHome = faker.datatype.boolean();

        const match = this.matchRepository.create({
          startTime: matchDate,
          durationMinutes: 90,
          location: faker.helpers.arrayElement(locations),
          opponent: faker.helpers.arrayElement(opponents),
          isHome,
          matchType: faker.helpers.arrayElement(matchTypes),
          homeGoals: null, // Future match - no results yet
          awayGoals: null,
          group,
        });
        futureMatches.push(match);
      }
    }

    const savedPastMatches = await this.matchRepository.save(pastMatches);
    const savedFutureMatches = await this.matchRepository.save(futureMatches);

    return {
      pastMatches: savedPastMatches,
      futureMatches: savedFutureMatches,
    };
  }

  private async seedAttendances(
    players: Player[],
    trainings: Training[],
    matches: Match[],
    groups: Group[],
  ): Promise<Attendance[]> {
    const attendances: Attendance[] = [];
    const attendanceRate = 0.85; // 85% attendance rate

    // Create a map of group -> players for efficiency
    const groupPlayersMap = new Map<string, Player[]>();
    for (const player of players) {
      if (player.group) {
        if (!groupPlayersMap.has(player.group.id)) {
          groupPlayersMap.set(player.group.id, []);
        }
        groupPlayersMap.get(player.group.id)!.push(player);
      }
    }

    // Seed training attendances
    for (const training of trainings) {
      const groupPlayers = groupPlayersMap.get(training.group.id) || [];

      for (const player of groupPlayers) {
        // Create attendance record with 85% chance of being present
        const isPresent = Math.random() < attendanceRate;
        const attendance = this.attendanceRepository.create({
          player,
          training,
          isPresent,
          notes: Math.random() < 0.1 ? faker.lorem.sentence() : null,
        });
        attendances.push(attendance);
      }
    }

    // Seed match attendances
    for (const match of matches) {
      const groupPlayers = groupPlayersMap.get(match.group.id) || [];

      for (const player of groupPlayers) {
        // Create attendance record with 85% chance of being present
        const isPresent = Math.random() < attendanceRate;
        const attendance = this.attendanceRepository.create({
          player,
          match,
          isPresent,
          notes: Math.random() < 0.1 ? faker.lorem.sentence() : null,
        });
        attendances.push(attendance);
      }
    }

    return await this.attendanceRepository.save(attendances);
  }

  private async seedEvaluations(
    attendances: Attendance[],
    groups: Group[],
  ): Promise<number> {
    console.log('📝 Generating evaluations (this may take a moment)...');

    // Create a map of group -> coach for quick lookup
    const groupCoachMap = new Map<string, Coach>();
    for (const group of groups) {
      if (group.headCoach) {
        groupCoachMap.set(group.id, group.headCoach);
      }
    }

    // Create evaluations only for players who were present
    const evaluations: Evaluation[] = [];

    for (const attendance of attendances) {
      // Skip if player was not present
      if (!attendance.isPresent) continue;

      const groupId =
        attendance.training?.group?.id || attendance.match?.group?.id;
      if (!groupId) continue;

      const coach = groupCoachMap.get(groupId);
      if (!coach) continue;

      const evaluation = this.evaluationRepository.create({
        technical: faker.number.int({ min: 1, max: 10 }),
        tactical: faker.number.int({ min: 1, max: 10 }),
        physical: faker.number.int({ min: 1, max: 10 }),
        psychological: faker.number.int({ min: 1, max: 10 }),
        comment: faker.lorem.sentence(),
        player: attendance.player,
        coach: coach,
        training: attendance.training || null,
        match: attendance.match || null,
      });

      evaluations.push(evaluation);
    }

    // Save evaluations in batches to avoid overwhelming the database
    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < evaluations.length; i += batchSize) {
      const batch = evaluations.slice(i, i + batchSize);
      await this.evaluationRepository.save(batch);
      insertedCount += batch.length;
      console.log(
        `  ⏳ Inserted ${insertedCount}/${evaluations.length} evaluations...`,
      );
    }

    return evaluations.length;
  }

  private async seedGoals(
    matches: Match[],
    attendances: Attendance[],
  ): Promise<Goal[]> {
    const goals: Goal[] = [];

    // Create a map of match -> attendees for quick lookup
    const matchAttendeesMap = new Map<string, Player[]>();
    for (const attendance of attendances) {
      if (attendance.match && attendance.isPresent) {
        if (!matchAttendeesMap.has(attendance.match.id)) {
          matchAttendeesMap.set(attendance.match.id, []);
        }
        matchAttendeesMap.get(attendance.match.id)!.push(attendance.player);
      }
    }

    for (const match of matches) {
      // Skip if no score (shouldn't happen for past matches, but safety check)
      if (match.homeGoals === null || match.awayGoals === null) continue;

      const attendees = matchAttendeesMap.get(match.id) || [];
      if (attendees.length === 0) continue; // No attendees, can't create goals

      // Determine how many goals our team scored
      // If isHome=true, our goals are homeGoals, otherwise awayGoals
      const ourGoalsCount = match.isHome ? match.homeGoals : match.awayGoals;

      // Create goals for our team
      for (let i = 0; i < ourGoalsCount; i++) {
        // Random minute between 1-90
        const minute = faker.number.int({ min: 1, max: 90 });

        // Pick a random scorer from attendees
        const scorer = faker.helpers.arrayElement(attendees);

        // 60% chance of having an assist
        let assist: Player | null = null;
        if (Math.random() < 0.6 && attendees.length > 1) {
          // Pick a different player for assist
          const possibleAssisters = attendees.filter((p) => p.id !== scorer.id);
          if (possibleAssisters.length > 0) {
            assist = faker.helpers.arrayElement(possibleAssisters);
          }
        }

        // 5% chance of own goal
        const isOwnGoal = Math.random() < 0.05;

        const goal = this.goalRepository.create({
          match,
          scorer,
          assist,
          minute,
          isOwnGoal,
        });

        goals.push(goal);
      }
    }

    return await this.goalRepository.save(goals);
  }
}
