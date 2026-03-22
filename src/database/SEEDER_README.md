# Football Academy Data Seeder

This high-volume data seeder generates realistic test data for the Football Academy ranking system.

## Overview

The seeder creates:
- **5 Coaches** with various license levels and experience
- **10 Groups** (age-based teams like U8, U10, U12, etc.)
- **60 Parents** 
- **100 Players** (randomly linked to parents, 1-3 kids per parent)
- **~390 Past Trainings** (3 per week for 90 days, per group)
- **~130 Past Matches** (1 per weekend for 90 days, per group)
- **~60 Future Trainings** (3 per week for 2 weeks, per group)
- **~20 Future Matches** (1 per weekend for 2 weeks, per group)
- **~8,500 Attendance Records** (85% attendance rate for past events)
- **~8,500 Evaluations** (one per attendance, pure random scores 1-10)

## Features

✅ **Production Guard**: Automatically disabled in production (`NODE_ENV === 'production'`)  
✅ **Bulk Inserts**: Uses TypeORM `.insert()` for evaluations (~5,000+ rows)  
✅ **Unique Constraint**: Respects `@Unique(['player', 'training', 'match'])`  
✅ **Timeline Separation**: Past events have evaluations, future events don't  
✅ **Realistic Data**: Uses Faker.js for authentic names, dates, and comments  

## Installation

1. Install Faker.js dependency:
```bash
npm install
```

The `@faker-js/faker` package has been added to `devDependencies` in `package.json`.

## Usage

### Run the seeder:
```bash
npm run seed
```

### What it does:
1. 🧹 Cleans existing data (evaluations, attendances, matches, trainings, players, groups, parents, coaches)
2. 🌱 Seeds all entities in proper order
3. 📝 Generates evaluations with random scores (1-10) for technical, tactical, physical, psychological
4. ✅ Outputs progress for each step

### Expected Output:
```
🌱 Starting database seeding...
🧹 Cleaning existing data...
✅ Created 5 coaches
✅ Created 10 groups
✅ Created 60 parents
✅ Created 100 players
✅ Created 390 past trainings and 60 future trainings
✅ Created 130 past matches and 20 future matches
✅ Created 8500 attendance records
📝 Generating evaluations (this may take a moment)...
  ⏳ Inserted 500/8500 evaluations...
  ⏳ Inserted 1000/8500 evaluations...
  ...
✅ Created 8500 evaluations
🎉 Database seeding completed successfully!
```

## Data Structure

### Coaches
- Random first/last names
- Phone numbers
- Date of birth (25-65 years old)
- License level (NONE, GRASSROOTS, UEFA_C, UEFA_B, UEFA_A, UEFA_PRO)
- Experience years (1-30)

### Groups
- Named by age group (U8 Eagles, U10 Lions, etc.)
- Assigned year of birth
- Linked to a head coach

### Parents
- Random first/last names
- Phone numbers
- Date of birth (30-55 years old)
- 1-3 children each

### Players
- Random first name, parent's last name
- Date of birth (6-16 years old)
- Position (GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST)
- Height (120-185 cm)
- Weight (25-80 kg)
- Strong foot (RIGHT, LEFT, BOTH)
- Linked to parent and group

### Trainings
- **Past**: 3 per week for 90 days (390 total per group)
- **Future**: 3 per week for 2 weeks (60 total per group)
- Start time: 5 PM (17:00)
- Duration: 90 minutes
- Random location and topic

### Matches
- **Past**: 1 per weekend for 90 days (130 total per group)
- **Future**: 1 per weekend for 2 weeks (20 total per group)
- Start time: 10 AM
- Duration: 90 minutes
- Random opponent, location, match type
- Past matches have random scores (0-5 goals)
- Future matches have null scores

### Attendances
- 85% attendance rate for all past events
- Linked to player and event (training OR match)
- Optional random notes (~10% of records)

### Evaluations
- **Only for past events with attendance**
- Technical: random 1-10
- Tactical: random 1-10
- Physical: random 1-10
- Psychological: random 1-10
- Comment: faker.lorem.sentence()
- Linked to player, coach, and event

## Technical Implementation

### Bulk Insert Strategy
For optimal performance with 5,000+ evaluations:
```typescript
const batchSize = 500;
for (let i = 0; i < evaluationData.length; i += batchSize) {
  const batch = evaluationData.slice(i, i + batchSize);
  await this.evaluationRepository.insert(batch);
}
```

### Unique Constraint Handling
The evaluation entity has:
```typescript
@Unique(['player', 'training', 'match'])
```
The seeder ensures only one evaluation per player per specific event by creating evaluations based on attendance records.

### Standalone Entry Point
Uses `NestFactory.createApplicationContext()` for standalone execution:
```typescript
const app = await NestFactory.createApplicationContext(SeedModule);
const seedService = app.get(DataSeedService);
await seedService.seed();
await app.close();
```

## Files

- `src/database/data-seed.service.ts` - Main seeding service with all logic
- `src/database/seed.ts` - Standalone entry point for running the seeder
- `package.json` - Added `seed` script and `@faker-js/faker` dependency

## Notes

- The seeder cleans the database before seeding (destructive operation)
- Future events intentionally have NO evaluations (for testing upcoming events)
- All dates are relative to the current time
- Parent-player relationships are randomly assigned (1-3 kids per parent)
- Group-player assignments are random across all groups
- Coach assignments to groups are random
