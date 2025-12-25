import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { join } from 'path';

async function seedAdmin() {
  console.log('Starting admin seed...');

  // Create a standalone DataSource using the same configuration as the app
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

    // Check if admin already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@football.com' },
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Skipping seed.');
      await dataSource.destroy();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin', 10);

    // Create admin user
    const adminUser = userRepository.create({
      email: 'admin@football.com',
      passwordHash: hashedPassword,
      role: UserRole.ADMIN,
      firstName: 'System',
      lastName: 'Administrator',
    });

    await userRepository.save(adminUser);
    console.log('Admin user created successfully!');
    console.log('Email: admin@football.com');
    console.log('Password: admin');
    console.log('Role: ADMIN');
  } catch (error) {
    console.error('Error during admin seed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed.');
  }
}

// Run the seed
seedAdmin();
