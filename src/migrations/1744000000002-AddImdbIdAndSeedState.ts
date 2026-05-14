import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImdbIdAndSeedState1744000000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "content_items"
      ADD COLUMN IF NOT EXISTS "imdbId" VARCHAR UNIQUE
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seed_state" (
        "id"            INTEGER PRIMARY KEY,
        "cursor"        INTEGER NOT NULL DEFAULT 0,
        "totalInserted" INTEGER NOT NULL DEFAULT 0,
        "lastRunAt"     TIMESTAMP
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "seed_state"`);
    await queryRunner.query(`ALTER TABLE "content_items" DROP COLUMN IF EXISTS "imdbId"`);
  }
}
