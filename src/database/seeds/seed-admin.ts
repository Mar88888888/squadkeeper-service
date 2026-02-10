import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { join } from 'path';

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    console.error('Example: ADMIN_EMAIL=admin@myacademy.com ADMIN_PASSWORD=securePass123 npm run seed:admin');
    process.exit(1);
  }

  console.log('Starting admin seed...');

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

    const existingAdmin = await userRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Skipping seed.');
      await dataSource.destroy();
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = userRepository.create({
      email: adminEmail,
      passwordHash: hashedPassword,
      role: UserRole.ADMIN,
      firstName: 'System',
      lastName: 'Administrator',
    });

    await userRepository.save(adminUser);
    console.log('Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Role: ADMIN');
  } catch (error) {
    console.error('Error during admin seed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed.');
  }
}

seedAdmin();
