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
      resolve(__dirname, '../migrations/20260922_candidate_applications.sql'),
      'utf8',
    );
    await database.query(sql);
    console.log(
      'Applied the additive candidate profile, application, and notification migration. Existing records were preserved.',
    );
  } finally {
    await database.destroy();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
