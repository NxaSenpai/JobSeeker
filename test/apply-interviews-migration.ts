import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';

async function main() {
  try {
    process.loadEnvFile('.env');
  } catch {
    /* Environment may already be set. */
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const database = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
  });
  await database.initialize();
  try {
    const sql = await readFile(
      resolve(__dirname, '../migrations/20260923_interviews.sql'),
      'utf8',
    );
    await database.query(sql);
    const [{ interviews, applications }] = await database.query(
      `SELECT
         (SELECT count(*)::int FROM "interviews") AS interviews,
         (SELECT count(*)::int FROM "applications") AS applications`,
    );
    console.log(
      `Applied interview migration. Existing applications were preserved; database contains ${applications} applications and ${interviews} interviews.`,
    );
  } finally {
    await database.destroy();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
