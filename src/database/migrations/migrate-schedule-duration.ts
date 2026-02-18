import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'f_academy',
});

async function migrate() {
  try {
    await dataSource.initialize();
    console.log('Connected to database');

    // Check if durationMinutes column exists
    const durationCheck = await dataSource.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'training_schedules' AND column_name = 'durationMinutes'
    `);

    if (durationCheck.length === 0) {
      console.log('Adding durationMinutes column...');
      await dataSource.query(`
        ALTER TABLE training_schedules
        ADD COLUMN "durationMinutes" integer DEFAULT 90 NOT NULL
      `);
    } else {
      console.log('durationMinutes column already exists');
    }

    // Check if old endTime column exists
    const endTimeCheck = await dataSource.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'training_schedules' AND column_name = 'endTime'
    `);

    if (endTimeCheck.length > 0) {
      console.log('Found old endTime column, migrating data...');

      // Calculate duration from startTime and endTime
      await dataSource.query(`
        UPDATE training_schedules
        SET "durationMinutes" =
          EXTRACT(EPOCH FROM ("endTime"::time - "startTime"::time)) / 60
      `);

      console.log('Dropping old endTime column...');
      await dataSource.query(`
        ALTER TABLE training_schedules DROP COLUMN "endTime"
      `);
    } else {
      console.log('No old endTime column found');
    }

    console.log('Migration completed successfully!');

    const count = await dataSource.query(`
      SELECT
        COUNT(*) as total,
        AVG("durationMinutes") as avg_duration
      FROM training_schedules
    `);
    console.log('Current schedule stats:', count[0]);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

migrate();
