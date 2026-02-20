import { MigrationInterface, QueryRunner } from 'typeorm';

export class MatchDuration1708444800000 implements MigrationInterface {
  name = 'MatchDuration1708444800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if endTime column exists (migration not yet applied)
    const hasEndTime = await queryRunner.hasColumn('matches', 'endTime');

    if (!hasEndTime) {
      console.log('Migration already applied. Skipping.');
      return;
    }

    // Add durationMinutes column
    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN "durationMinutes" smallint
    `);

    // Calculate duration from existing endTime - startTime
    await queryRunner.query(`
      UPDATE "matches"
      SET "durationMinutes" = EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60
    `);

    // Set default for any NULL values (90 min standard match)
    await queryRunner.query(`
      UPDATE "matches"
      SET "durationMinutes" = 90
      WHERE "durationMinutes" IS NULL
    `);

    // Make column NOT NULL
    await queryRunner.query(`
      ALTER TABLE "matches"
      ALTER COLUMN "durationMinutes" SET NOT NULL
    `);

    // Drop endTime column
    await queryRunner.query(`
      ALTER TABLE "matches"
      DROP COLUMN "endTime"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add endTime column back
    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN "endTime" TIMESTAMP WITH TIME ZONE
    `);

    // Calculate endTime from startTime + durationMinutes
    await queryRunner.query(`
      UPDATE "matches"
      SET "endTime" = "startTime" + ("durationMinutes" || ' minutes')::interval
    `);

    // Make column NOT NULL
    await queryRunner.query(`
      ALTER TABLE "matches"
      ALTER COLUMN "endTime" SET NOT NULL
    `);

    // Drop durationMinutes column
    await queryRunner.query(`
      ALTER TABLE "matches"
      DROP COLUMN "durationMinutes"
    `);
  }
}
