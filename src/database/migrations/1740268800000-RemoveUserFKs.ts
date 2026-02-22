import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUserFKs1740268800000 implements MigrationInterface {
  name = 'RemoveUserFKs1740268800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop FK constraints and columns for coach, player, parent from users table
    // These are redundant - the relationship is owned by the other side

    const columns = ['coachId', 'playerId', 'parentId'];

    for (const column of columns) {
      const hasColumn = await queryRunner.hasColumn('users', column);
      if (hasColumn) {
        // Drop FK constraint first (naming convention: FK_users_<column>)
        const table = await queryRunner.getTable('users');
        const fk = table?.foreignKeys.find((fk) => fk.columnNames.includes(column));
        if (fk) {
          await queryRunner.dropForeignKey('users', fk);
        }

        await queryRunner.dropColumn('users', column);
        console.log(`Dropped column: users.${column}`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add columns and FK constraints
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "playerId" uuid,
      ADD COLUMN "coachId" uuid,
      ADD COLUMN "parentId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_playerId" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL,
      ADD CONSTRAINT "FK_users_coachId" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE SET NULL,
      ADD CONSTRAINT "FK_users_parentId" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE SET NULL
    `);
  }
}
