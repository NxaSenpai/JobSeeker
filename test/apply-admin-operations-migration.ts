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
      resolve(__dirname, '../migrations/20260924_admin_operations.sql'),
      'utf8',
    );
    await database.query(sql);
    const countRows: unknown = await database.query(
      `SELECT
         (SELECT count(*)::int FROM "users") AS users,
         (SELECT count(*)::int FROM "companies") AS companies,
         (SELECT count(*)::int FROM "jobs") AS jobs`,
    );
    if (!Array.isArray(countRows) || countRows.length !== 1) {
      throw new Error('Could not verify migrated record counts.');
    }
    const countRow: unknown = countRows[0];
    if (
      typeof countRow !== 'object' ||
      countRow === null ||
      !('users' in countRow) ||
      !('companies' in countRow) ||
      !('jobs' in countRow)
    ) {
      throw new Error('Could not verify migrated record counts.');
    }
    const users = Number(countRow.users);
    const companies = Number(countRow.companies);
    const jobs = Number(countRow.jobs);
    console.log(
      `Applied admin operations migration. Existing records were preserved; database contains ${users} users, ${companies} companies, and ${jobs} jobs.`,
    );
  } finally {
    await database.destroy();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
