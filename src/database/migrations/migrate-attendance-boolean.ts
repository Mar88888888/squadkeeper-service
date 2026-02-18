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

    // Check if isPresent column exists
    const columnCheck = await dataSource.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'attendances' AND column_name = 'isPresent'
    `);

    if (columnCheck.length === 0) {
      console.log('Adding isPresent column...');
      await dataSource.query(`
        ALTER TABLE attendances
        ADD COLUMN "isPresent" boolean DEFAULT true NOT NULL
      `);
    } else {
      console.log('isPresent column already exists');
    }

    // Check if old status column exists (for backward compatibility)
    const statusCheck = await dataSource.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'attendances' AND column_name = 'status'
    `);

    if (statusCheck.length > 0) {
      console.log('Found old status column, migrating data...');
      await dataSource.query(`
        UPDATE attendances
        SET "isPresent" = CASE
          WHEN status IN ('PRESENT', 'LATE') THEN true
          ELSE false
        END
      `);

      console.log('Dropping old status column...');
      await dataSource.query(`
        ALTER TABLE attendances DROP COLUMN status
      `);

      console.log('Dropping old enum type if exists...');
      await dataSource.query(`
        DROP TYPE IF EXISTS attendances_status_enum
      `);
    } else {
      console.log('No old status column found - ensuring all records have isPresent = true');
      await dataSource.query(`
        UPDATE attendances SET "isPresent" = true WHERE "isPresent" IS NULL
      `);
    }

    console.log('Migration completed successfully!');

    const count = await dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE "isPresent" = true) as present,
        COUNT(*) FILTER (WHERE "isPresent" = false) as absent,
        COUNT(*) as total
      FROM attendances
    `);
    console.log('Current attendance counts:', count[0]);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

migrate();
