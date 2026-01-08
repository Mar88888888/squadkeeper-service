import { DataSource } from 'typeorm';
import { join } from 'path';

// Mapping from old values to new enum values
const POSITION_MAPPING: Record<string, string> = {
  // Old full names to new codes
  Goalkeeper: 'GK',
  goalkeeper: 'GK',
  GOALKEEPER: 'GK',
  Defender: 'CB',
  defender: 'CB',
  DEFENDER: 'CB',
  Midfielder: 'CM',
  midfielder: 'CM',
  MIDFIELDER: 'CM',
  Forward: 'ST',
  forward: 'ST',
  FORWARD: 'ST',
  // E2E fixtures variations
  FW: 'ST',
  MF: 'CM',
  DF: 'CB',
  // Winger variations
  Winger: 'LW',
  winger: 'LW',
  WINGER: 'LW',
  // Already correct - no change needed
  GK: 'GK',
  CB: 'CB',
  LB: 'LB',
  RB: 'RB',
  CDM: 'CDM',
  CM: 'CM',
  CAM: 'CAM',
  LW: 'LW',
  RW: 'RW',
  ST: 'ST',
};

const STRONG_FOOT_MAPPING: Record<string, string> = {
  Right: 'RIGHT',
  right: 'RIGHT',
  Left: 'LEFT',
  left: 'LEFT',
  Both: 'BOTH',
  both: 'BOTH',
  // Already correct
  RIGHT: 'RIGHT',
  LEFT: 'LEFT',
  BOTH: 'BOTH',
};

async function migratePlayerEnums() {
  console.log('Starting player enums migration...');

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
    console.log('Database connected.');

    // Check current values before migration
    console.log('\nCurrent position values in database:');
    const currentPositions = await dataSource.query(
      `SELECT DISTINCT position, COUNT(*) as count FROM players GROUP BY position`,
    );
    console.table(currentPositions);

    console.log('\nCurrent strongFoot values in database:');
    const currentFeet = await dataSource.query(
      `SELECT DISTINCT "strongFoot", COUNT(*) as count FROM players GROUP BY "strongFoot"`,
    );
    console.table(currentFeet);

    // Step 0: Fix NULL values first
    console.log('\nFixing NULL values...');
    const nullPosResult = await dataSource.query(
      `UPDATE players SET position = 'CM' WHERE position IS NULL`,
    );
    if (nullPosResult[1] > 0) {
      console.log(`  Fixed ${nullPosResult[1]} NULL position values -> CM`);
    }
    const nullFootResult = await dataSource.query(
      `UPDATE players SET "strongFoot" = 'RIGHT' WHERE "strongFoot" IS NULL`,
    );
    if (nullFootResult[1] > 0) {
      console.log(`  Fixed ${nullFootResult[1]} NULL strongFoot values -> RIGHT`);
    }

    // Step 1: Update position values
    console.log('\nMigrating position values...');
    for (const [oldValue, newValue] of Object.entries(POSITION_MAPPING)) {
      if (oldValue !== newValue) {
        const result = await dataSource.query(
          `UPDATE players SET position = $1 WHERE position = $2`,
          [newValue, oldValue],
        );
        if (result[1] > 0) {
          console.log(`  Updated ${result[1]} rows: "${oldValue}" -> "${newValue}"`);
        }
      }
    }

    // Step 2: Update strongFoot values
    console.log('\nMigrating strongFoot values...');
    for (const [oldValue, newValue] of Object.entries(STRONG_FOOT_MAPPING)) {
      if (oldValue !== newValue) {
        const result = await dataSource.query(
          `UPDATE players SET "strongFoot" = $1 WHERE "strongFoot" = $2`,
          [newValue, oldValue],
        );
        if (result[1] > 0) {
          console.log(`  Updated ${result[1]} rows: "${oldValue}" -> "${newValue}"`);
        }
      }
    }

    // Step 3: Verify no invalid values remain
    console.log('\nVerifying migration...');
    const validPositions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
    const invalidPositions = await dataSource.query(
      `SELECT DISTINCT position FROM players WHERE position NOT IN (${validPositions.map((_, i) => `$${i + 1}`).join(', ')})`,
      validPositions,
    );
    if (invalidPositions.length > 0) {
      console.error('WARNING: Found invalid position values:', invalidPositions);
    } else {
      console.log('  All position values are valid.');
    }

    const validFeet = ['RIGHT', 'LEFT', 'BOTH'];
    const invalidFeet = await dataSource.query(
      `SELECT DISTINCT "strongFoot" FROM players WHERE "strongFoot" NOT IN ($1, $2, $3)`,
      validFeet,
    );
    if (invalidFeet.length > 0) {
      console.error('WARNING: Found invalid strongFoot values:', invalidFeet);
    } else {
      console.log('  All strongFoot values are valid.');
    }

    // Show final state
    console.log('\nFinal position values in database:');
    const finalPositions = await dataSource.query(
      `SELECT DISTINCT position, COUNT(*) as count FROM players GROUP BY position`,
    );
    console.table(finalPositions);

    console.log('\nFinal strongFoot values in database:');
    const finalFeet = await dataSource.query(
      `SELECT DISTINCT "strongFoot", COUNT(*) as count FROM players GROUP BY "strongFoot"`,
    );
    console.table(finalFeet);

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

migratePlayerEnums();
