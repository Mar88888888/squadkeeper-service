import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeDeletes1772021362914 implements MigrationInterface {
    name = 'AddCascadeDeletes1772021362914'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "coaches" DROP CONSTRAINT "FK_aff053106aac14fb7a780800bce"`);
        await queryRunner.query(`ALTER TABLE "parents" DROP CONSTRAINT "FK_f1e08daeefd9c2e5def5746be7e"`);
        await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "FK_3e47b0d4584469e7641259ee149"`);
        await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "FK_7c11c744c0601ab432cfa6ff7ad"`);
        await queryRunner.query(`ALTER TABLE "coaches" ADD CONSTRAINT "FK_aff053106aac14fb7a780800bce" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "parents" ADD CONSTRAINT "FK_f1e08daeefd9c2e5def5746be7e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "players" ADD CONSTRAINT "FK_7c11c744c0601ab432cfa6ff7ad" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "players" ADD CONSTRAINT "FK_3e47b0d4584469e7641259ee149" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "FK_3e47b0d4584469e7641259ee149"`);
        await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "FK_7c11c744c0601ab432cfa6ff7ad"`);
        await queryRunner.query(`ALTER TABLE "parents" DROP CONSTRAINT "FK_f1e08daeefd9c2e5def5746be7e"`);
        await queryRunner.query(`ALTER TABLE "coaches" DROP CONSTRAINT "FK_aff053106aac14fb7a780800bce"`);
        await queryRunner.query(`ALTER TABLE "players" ADD CONSTRAINT "FK_7c11c744c0601ab432cfa6ff7ad" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "players" ADD CONSTRAINT "FK_3e47b0d4584469e7641259ee149" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "parents" ADD CONSTRAINT "FK_f1e08daeefd9c2e5def5746be7e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "coaches" ADD CONSTRAINT "FK_aff053106aac14fb7a780800bce" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
