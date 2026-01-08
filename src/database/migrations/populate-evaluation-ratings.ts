import { DataSource } from 'typeorm';

/**
 * Populates missing evaluation ratings with random values (5-9)
 * Run with: npx ts-node src/database/migrations/populate-evaluation-ratings.ts
 */

async function populateRatings() {
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

  try {
    // Update all evaluations with NULL ratings
    const result = await dataSource.query(`
      UPDATE evaluations
      SET
        technical = floor(random() * 5 + 5)::int,
        tactical = floor(random() * 5 + 5)::int,
        physical = floor(random() * 5 + 5)::int,
        psychological = floor(random() * 5 + 5)::int
      WHERE technical IS NULL
         OR tactical IS NULL
         OR physical IS NULL
         OR psychological IS NULL
    `);

    console.log('Updated evaluations:', result);

    // Verify the update
    const count = await dataSource.query(`
      SELECT COUNT(*) as total,
             COUNT(technical) as with_technical,
             COUNT(tactical) as with_tactical,
             COUNT(physical) as with_physical,
             COUNT(psychological) as with_psychological
      FROM evaluations
    `);
    console.log('Verification:', count[0]);

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

populateRatings().catch((error) => {
  console.error('Script error:', error);
  process.exit(1);
});
