import { DataSource } from 'typeorm';

/**
 * Migration to transform evaluations from multiple rows (one per type)
 * to single row with all ratings as columns.
 *
 * Before: 4 rows per player per event (TECHNICAL, TACTICAL, PHYSICAL, PSYCHOLOGICAL)
 * After:  1 row per player per event with technical, tactical, physical, psychological columns
 *
 * Run with: npx ts-node src/database/migrations/transform-evaluations.ts
 */

async function runMigration() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'football_academy',
  });

  await dataSource.initialize();
  console.log('Connected to database');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Step 1: Check if migration is needed (if 'type' column exists)
    const columns = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'evaluations' AND column_name = 'type'
    `);

    if (columns.length === 0) {
      console.log('Migration already applied - type column does not exist');
      await queryRunner.rollbackTransaction();
      await dataSource.destroy();
      return;
    }

    console.log('Starting evaluation migration...');

    // Step 2: Add new columns if they don't exist
    const existingColumns = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'evaluations'
    `);
    const columnNames = existingColumns.map((c: { column_name: string }) => c.column_name);

    if (!columnNames.includes('technical')) {
      await queryRunner.query(`ALTER TABLE evaluations ADD COLUMN technical integer`);
      console.log('Added technical column');
    }
    if (!columnNames.includes('tactical')) {
      await queryRunner.query(`ALTER TABLE evaluations ADD COLUMN tactical integer`);
      console.log('Added tactical column');
    }
    if (!columnNames.includes('physical')) {
      await queryRunner.query(`ALTER TABLE evaluations ADD COLUMN physical integer`);
      console.log('Added physical column');
    }
    if (!columnNames.includes('psychological')) {
      await queryRunner.query(`ALTER TABLE evaluations ADD COLUMN psychological integer`);
      console.log('Added psychological column');
    }

    // Step 3: Get all unique player+event combinations
    const combinations = await queryRunner.query(`
      SELECT DISTINCT "playerId", "trainingId", "matchId", "coachId"
      FROM evaluations
    `);
    console.log(`Found ${combinations.length} unique player+event combinations`);

    // Step 4: For each combination, create a single row with all ratings
    let migratedCount = 0;
    let skippedCount = 0;

    for (const combo of combinations) {
      const { playerId, trainingId, matchId, coachId } = combo;

      // Get all evaluations for this combination
      const evaluations = await queryRunner.query(
        `SELECT type, rating, comment FROM evaluations
         WHERE "playerId" = $1
         AND ("trainingId" = $2 OR ($2 IS NULL AND "trainingId" IS NULL))
         AND ("matchId" = $3 OR ($3 IS NULL AND "matchId" IS NULL))`,
        [playerId, trainingId, matchId]
      );

      // Build ratings object
      const ratings: {
        technical: number;
        tactical: number;
        physical: number;
        psychological: number;
        comment: string | null;
      } = {
        technical: 5, // default
        tactical: 5,  // default
        physical: 5,  // default
        psychological: 5, // default
        comment: null,
      };

      for (const evaluation of evaluations) {
        const type = evaluation.type.toLowerCase();
        if (type in ratings) {
          (ratings as Record<string, number | string | null>)[type] = evaluation.rating;
        }
        if (evaluation.comment) {
          ratings.comment = evaluation.comment;
        }
      }

      // Update the first row with all ratings
      const firstEval = evaluations[0];
      if (firstEval) {
        // Find ID of first evaluation for this combo
        const firstRow = await queryRunner.query(
          `SELECT id FROM evaluations
           WHERE "playerId" = $1
           AND ("trainingId" = $2 OR ($2 IS NULL AND "trainingId" IS NULL))
           AND ("matchId" = $3 OR ($3 IS NULL AND "matchId" IS NULL))
           LIMIT 1`,
          [playerId, trainingId, matchId]
        );

        if (firstRow.length > 0) {
          // Update first row with consolidated data
          await queryRunner.query(
            `UPDATE evaluations SET
             technical = $1,
             tactical = $2,
             physical = $3,
             psychological = $4,
             comment = $5
             WHERE id = $6`,
            [
              ratings.technical,
              ratings.tactical,
              ratings.physical,
              ratings.psychological,
              ratings.comment,
              firstRow[0].id,
            ]
          );

          // Delete other rows for this combination
          await queryRunner.query(
            `DELETE FROM evaluations
             WHERE "playerId" = $1
             AND ("trainingId" = $2 OR ($2 IS NULL AND "trainingId" IS NULL))
             AND ("matchId" = $3 OR ($3 IS NULL AND "matchId" IS NULL))
             AND id != $4`,
            [playerId, trainingId, matchId, firstRow[0].id]
          );

          migratedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`Migrated ${migratedCount} evaluations, skipped ${skippedCount}`);

    // Step 5: Drop old columns
    await queryRunner.query(`ALTER TABLE evaluations DROP COLUMN IF EXISTS type`);
    await queryRunner.query(`ALTER TABLE evaluations DROP COLUMN IF EXISTS rating`);
    console.log('Dropped old type and rating columns');

    // Step 6: Add unique constraint for player+event
    await queryRunner.query(`
      ALTER TABLE evaluations
      ADD CONSTRAINT evaluations_player_event_unique
      UNIQUE ("playerId", "trainingId", "matchId")
    `).catch(() => {
      console.log('Unique constraint may already exist');
    });

    await queryRunner.commitTransaction();
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

runMigration().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});
