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
      resolve(__dirname, '../migrations/20260923_companies_and_jobs.sql'),
      'utf8',
    );
    await database.query(sql);
    const [{ companies, jobs }] = await database.query(
      `SELECT
         (SELECT count(*)::int FROM "companies") AS companies,
         (SELECT count(*)::int FROM "jobs") AS jobs`,
    );
    console.log(
      `Applied company/job schema migration. Existing records were preserved; database contains ${companies} companies and ${jobs} jobs.`,
    );
  } finally {
    await database.destroy();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
