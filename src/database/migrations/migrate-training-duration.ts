import { DataSource } from 'typeorm';
import { join } from 'path';

async function migrateTrainingDuration() {
  console.log('Starting training duration migration...');

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

    const queryRunner = dataSource.createQueryRunner();

    // Check if endTime column still exists
    const columns = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'trainings' AND column_name = 'endTime'
    `);

    if (columns.length === 0) {
      console.log(
        'Migration already applied (endTime column not found). Skipping.',
      );
      await dataSource.destroy();
      return;
    }

    console.log('Adding durationMinutes column...');

    await queryRunner.query(`
      ALTER TABLE trainings
      ADD COLUMN IF NOT EXISTS "durationMinutes" smallint
    `);

    console.log('Calculating duration from existing data...');

    // Calculate durationMinutes from existing endTime - startTime
    await queryRunner.query(`
      UPDATE trainings
      SET "durationMinutes" = EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60
      WHERE "durationMinutes" IS NULL
    `);

    // Set default for any NULL values (shouldn't happen, but safety)
    await queryRunner.query(`
      UPDATE trainings
      SET "durationMinutes" = 90
      WHERE "durationMinutes" IS NULL
    `);

    // Make column NOT NULL
    await queryRunner.query(`
      ALTER TABLE trainings
      ALTER COLUMN "durationMinutes" SET NOT NULL
    `);

    console.log('Dropping endTime column...');

    // Drop endTime column
    await queryRunner.query(`
      ALTER TABLE trainings
      DROP COLUMN "endTime"
    `);

    console.log('Migration completed successfully!');

    // Show sample of migrated data
    const sample = await queryRunner.query(`
      SELECT id, "startTime", "durationMinutes"
      FROM trainings
      LIMIT 5
    `);

    if (sample.length > 0) {
      console.log('\nSample migrated trainings:');
      sample.forEach(
        (row: { id: string; startTime: Date; durationMinutes: number }) => {
          console.log(
            `  ID: ${row.id}, Start: ${row.startTime}, Duration: ${row.durationMinutes} min`,
          );
        },
      );
    }
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed.');
  }
}

migrateTrainingDuration();
