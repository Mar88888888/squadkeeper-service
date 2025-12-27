import { DataSource, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { join } from 'path';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { Coach } from '../../coaches/entities/coach.entity';
import { Player } from '../../players/entities/player.entity';
import { Parent } from '../../parents/entities/parent.entity';
import { Group } from '../../groups/entities/group.entity';

const coachesData = [
  { firstName: 'Олександр', lastName: 'Шовковський', email: 'shovkovskyi@academy.com', licenseLevel: 'UEFA Pro', experienceYears: 15, dateOfBirth: '1975-01-02' },
  { firstName: 'Андрій', lastName: 'Шевченко', email: 'shevchenko@academy.com', licenseLevel: 'UEFA Pro', experienceYears: 12, dateOfBirth: '1976-09-29' },
  { firstName: 'Сергій', lastName: 'Ребров', email: 'rebrov@academy.com', licenseLevel: 'UEFA A', experienceYears: 10, dateOfBirth: '1974-06-03' },
  { firstName: 'Олег', lastName: 'Лужний', email: 'luzhnyi@academy.com', licenseLevel: 'UEFA A', experienceYears: 8, dateOfBirth: '1968-08-05' },
  { firstName: 'Анатолій', lastName: 'Тимощук', email: 'tymoshchuk@academy.com', licenseLevel: 'UEFA B', experienceYears: 5, dateOfBirth: '1979-03-30' },
  { firstName: 'Руслан', lastName: 'Ротань', email: 'rotan@academy.com', licenseLevel: 'UEFA B', experienceYears: 4, dateOfBirth: '1981-10-29' },
];

const playersData = [
  // U-12 (2013)
  { firstName: 'Максим', lastName: 'Коваленко', email: 'kovalenko.m@academy.com', dateOfBirth: '2013-03-15', position: 'Midfielder', groupYear: 2013, height: 145, weight: 38, strongFoot: 'Right' },
  { firstName: 'Артем', lastName: 'Бондаренко', email: 'bondarenko.a@academy.com', dateOfBirth: '2013-07-22', position: 'Forward', groupYear: 2013, height: 148, weight: 40, strongFoot: 'Left' },
  { firstName: 'Дмитро', lastName: 'Шевчук', email: 'shevchuk.d@academy.com', dateOfBirth: '2013-01-10', position: 'Defender', groupYear: 2013, height: 150, weight: 42, strongFoot: 'Right' },
  { firstName: 'Олексій', lastName: 'Мельник', email: 'melnyk.o@academy.com', dateOfBirth: '2013-11-05', position: 'Goalkeeper', groupYear: 2013, height: 152, weight: 44, strongFoot: 'Right' },
  { firstName: 'Богдан', lastName: 'Ткаченко', email: 'tkachenko.b@academy.com', dateOfBirth: '2013-05-18', position: 'Midfielder', groupYear: 2013, height: 144, weight: 37, strongFoot: 'Both' },
  { firstName: 'Владислав', lastName: 'Петренко', email: 'petrenko.v@academy.com', dateOfBirth: '2013-09-30', position: 'Defender', groupYear: 2013, height: 149, weight: 41, strongFoot: 'Right' },

  // U-14 (2011)
  { firstName: 'Назар', lastName: 'Кравченко', email: 'kravchenko.n@academy.com', dateOfBirth: '2011-02-14', position: 'Forward', groupYear: 2011, height: 162, weight: 50, strongFoot: 'Right' },
  { firstName: 'Ілля', lastName: 'Савченко', email: 'savchenko.i@academy.com', dateOfBirth: '2011-06-08', position: 'Midfielder', groupYear: 2011, height: 158, weight: 48, strongFoot: 'Left' },
  { firstName: 'Данило', lastName: 'Литвиненко', email: 'lytvynenko.d@academy.com', dateOfBirth: '2011-12-25', position: 'Defender', groupYear: 2011, height: 165, weight: 52, strongFoot: 'Right' },
  { firstName: 'Тимур', lastName: 'Марченко', email: 'marchenko.t@academy.com', dateOfBirth: '2011-04-03', position: 'Midfielder', groupYear: 2011, height: 160, weight: 49, strongFoot: 'Right' },
  { firstName: 'Кирило', lastName: 'Гончаренко', email: 'goncharenko.k@academy.com', dateOfBirth: '2011-08-19', position: 'Forward', groupYear: 2011, height: 163, weight: 51, strongFoot: 'Both' },
  { firstName: 'Ярослав', lastName: 'Павленко', email: 'pavlenko.y@academy.com', dateOfBirth: '2011-10-11', position: 'Goalkeeper', groupYear: 2011, height: 168, weight: 55, strongFoot: 'Right' },

  // U-16 (2009)
  { firstName: 'Олег', lastName: 'Сидоренко', email: 'sydorenko.o@academy.com', dateOfBirth: '2009-01-28', position: 'Forward', groupYear: 2009, height: 175, weight: 65, strongFoot: 'Left' },
  { firstName: 'Андрій', lastName: 'Іваненко', email: 'ivanenko.a@academy.com', dateOfBirth: '2009-05-17', position: 'Midfielder', groupYear: 2009, height: 172, weight: 62, strongFoot: 'Right' },
  { firstName: 'Євген', lastName: 'Федоренко', email: 'fedorenko.e@academy.com', dateOfBirth: '2009-09-09', position: 'Defender', groupYear: 2009, height: 178, weight: 68, strongFoot: 'Right' },
  { firstName: 'Михайло', lastName: 'Кузьменко', email: 'kuzmenko.m@academy.com', dateOfBirth: '2009-03-21', position: 'Midfielder', groupYear: 2009, height: 170, weight: 60, strongFoot: 'Both' },
  { firstName: 'Роман', lastName: 'Клименко', email: 'klymenko.r@academy.com', dateOfBirth: '2009-07-14', position: 'Defender', groupYear: 2009, height: 176, weight: 66, strongFoot: 'Right' },
  { firstName: 'Сергій', lastName: 'Яременко', email: 'yaremenko.s@academy.com', dateOfBirth: '2009-11-30', position: 'Goalkeeper', groupYear: 2009, height: 182, weight: 72, strongFoot: 'Right' },
];

const parentsData = [
  { firstName: 'Віктор', lastName: 'Коваленко', email: 'v.kovalenko@gmail.com', phone: '+380501234567', childLastNames: ['Коваленко'] },
  { firstName: 'Олена', lastName: 'Бондаренко', email: 'o.bondarenko@gmail.com', phone: '+380502345678', childLastNames: ['Бондаренко'] },
  { firstName: 'Петро', lastName: 'Шевчук', email: 'p.shevchuk@gmail.com', phone: '+380503456789', childLastNames: ['Шевчук'] },
  { firstName: 'Наталія', lastName: 'Мельник', email: 'n.melnyk@gmail.com', phone: '+380504567890', childLastNames: ['Мельник'] },
  { firstName: 'Ігор', lastName: 'Ткаченко', email: 'i.tkachenko@gmail.com', phone: '+380505678901', childLastNames: ['Ткаченко'] },
  { firstName: 'Марія', lastName: 'Петренко', email: 'm.petrenko@gmail.com', phone: '+380506789012', childLastNames: ['Петренко'] },
  { firstName: 'Василь', lastName: 'Кравченко', email: 'v.kravchenko@gmail.com', phone: '+380507890123', childLastNames: ['Кравченко'] },
  { firstName: 'Тетяна', lastName: 'Савченко', email: 't.savchenko@gmail.com', phone: '+380508901234', childLastNames: ['Савченко'] },
  { firstName: 'Олександр', lastName: 'Литвиненко', email: 'o.lytvynenko@gmail.com', phone: '+380509012345', childLastNames: ['Литвиненко'] },
  { firstName: 'Ірина', lastName: 'Марченко', email: 'i.marchenko@gmail.com', phone: '+380501122334', childLastNames: ['Марченко'] },
  { firstName: 'Дмитро', lastName: 'Гончаренко', email: 'd.goncharenko@gmail.com', phone: '+380502233445', childLastNames: ['Гончаренко'] },
  { firstName: 'Світлана', lastName: 'Павленко', email: 's.pavlenko@gmail.com', phone: '+380503344556', childLastNames: ['Павленко'] },
  { firstName: 'Микола', lastName: 'Сидоренко', email: 'm.sydorenko@gmail.com', phone: '+380504455667', childLastNames: ['Сидоренко'] },
  { firstName: 'Людмила', lastName: 'Іваненко', email: 'l.ivanenko@gmail.com', phone: '+380505566778', childLastNames: ['Іваненко'] },
  { firstName: 'Юрій', lastName: 'Федоренко', email: 'y.fedorenko@gmail.com', phone: '+380506677889', childLastNames: ['Федоренко'] },
];

const groupsData = [
  { name: 'U-12 Основна', yearOfBirth: 2013, headCoachIndex: 0, assistantIndices: [4] },
  { name: 'U-14 Основна', yearOfBirth: 2011, headCoachIndex: 1, assistantIndices: [5] },
  { name: 'U-16 Основна', yearOfBirth: 2009, headCoachIndex: 2, assistantIndices: [3] },
];

async function seedTestData() {
  console.log('Starting test data seed...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'football_academy',
    entities: [join(__dirname, '..', '..', '**', '*.entity.{ts,js}')],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established.');

    const userRepository = dataSource.getRepository(User);
    const coachRepository = dataSource.getRepository(Coach);
    const playerRepository = dataSource.getRepository(Player);
    const parentRepository = dataSource.getRepository(Parent);
    const groupRepository = dataSource.getRepository(Group);

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Coaches
    console.log('\nCreating coaches...');
    const createdCoaches: Coach[] = [];
    for (const coachData of coachesData) {
      const existingUser = await userRepository.findOne({ where: { email: coachData.email } });
      if (existingUser) {
        console.log(`  Coach ${coachData.email} already exists, skipping.`);
        const existingCoach = await coachRepository.findOne({ where: { user: { id: existingUser.id } } });
        if (existingCoach) createdCoaches.push(existingCoach);
        continue;
      }

      const user = userRepository.create({
        email: coachData.email,
        passwordHash: hashedPassword,
        role: UserRole.COACH,
        firstName: coachData.firstName,
        lastName: coachData.lastName,
      });
      await userRepository.save(user);

      const coach = coachRepository.create({
        firstName: coachData.firstName,
        lastName: coachData.lastName,
        dateOfBirth: new Date(coachData.dateOfBirth),
        licenseLevel: coachData.licenseLevel,
        experienceYears: coachData.experienceYears,
        user,
      });
      await coachRepository.save(coach);

      user.coach = coach;
      await userRepository.save(user);

      createdCoaches.push(coach);
      console.log(`  Created coach: ${coachData.firstName} ${coachData.lastName}`);
    }

    // Create Groups
    console.log('\nCreating groups...');
    const createdGroups: Group[] = [];
    for (const groupData of groupsData) {
      const existingGroup = await groupRepository.findOne({ where: { name: groupData.name } });
      if (existingGroup) {
        console.log(`  Group ${groupData.name} already exists, skipping.`);
        createdGroups.push(existingGroup);
        continue;
      }

      const group = groupRepository.create({
        name: groupData.name,
        yearOfBirth: groupData.yearOfBirth,
        headCoach: createdCoaches[groupData.headCoachIndex] || null,
        assistants: groupData.assistantIndices.map(i => createdCoaches[i]).filter(Boolean),
      });
      await groupRepository.save(group);
      createdGroups.push(group);
      console.log(`  Created group: ${groupData.name}`);
    }

    // Create Players
    console.log('\nCreating players...');
    const createdPlayers: Player[] = [];
    for (const playerData of playersData) {
      const existingUser = await userRepository.findOne({ where: { email: playerData.email } });
      if (existingUser) {
        console.log(`  Player ${playerData.email} already exists, skipping.`);
        const existingPlayer = await playerRepository.findOne({ where: { user: { id: existingUser.id } } });
        if (existingPlayer) createdPlayers.push(existingPlayer);
        continue;
      }

      const user = userRepository.create({
        email: playerData.email,
        passwordHash: hashedPassword,
        role: UserRole.PLAYER,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
      });
      await userRepository.save(user);

      const group = createdGroups.find(g => g.yearOfBirth === playerData.groupYear);

      const player = playerRepository.create({
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        dateOfBirth: new Date(playerData.dateOfBirth),
        position: playerData.position,
        height: playerData.height,
        weight: playerData.weight,
        strongFoot: playerData.strongFoot,
        user,
        ...(group ? { group } : {}),
      });
      await playerRepository.save(player);

      user.player = player;
      await userRepository.save(user);

      createdPlayers.push(player);
      console.log(`  Created player: ${playerData.firstName} ${playerData.lastName} (${playerData.position})`);
    }

    // Create Parents
    console.log('\nCreating parents...');
    for (const parentData of parentsData) {
      const existingUser = await userRepository.findOne({ where: { email: parentData.email } });
      if (existingUser) {
        console.log(`  Parent ${parentData.email} already exists, skipping.`);
        continue;
      }

      const user = userRepository.create({
        email: parentData.email,
        passwordHash: hashedPassword,
        role: UserRole.PARENT,
        firstName: parentData.firstName,
        lastName: parentData.lastName,
      });
      await userRepository.save(user);

      const parent = parentRepository.create({
        firstName: parentData.firstName,
        lastName: parentData.lastName,
        phoneNumber: parentData.phone,
        user,
      });
      await parentRepository.save(parent);

      user.parent = parent;
      await userRepository.save(user);

      // Link children
      const children = createdPlayers.filter(p =>
        parentData.childLastNames.includes(p.lastName)
      );

      if (children.length > 0) {
        for (const child of children) {
          child.parent = parent;
          await playerRepository.save(child);
        }
        console.log(`  Created parent: ${parentData.firstName} ${parentData.lastName} (children: ${children.map(c => c.firstName).join(', ')})`);
      } else {
        console.log(`  Created parent: ${parentData.firstName} ${parentData.lastName} (no children linked)`);
      }
    }

    console.log('\n✅ Test data seeded successfully!');
    console.log('\nSummary:');
    console.log(`  - Coaches: ${coachesData.length}`);
    console.log(`  - Groups: ${groupsData.length}`);
    console.log(`  - Players: ${playersData.length}`);
    console.log(`  - Parents: ${parentsData.length}`);
    console.log('\nAll users have password: password123');

  } catch (error) {
    console.error('Error during test data seed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('\nDatabase connection closed.');
  }
}

seedTestData();
