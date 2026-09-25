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
      resolve(__dirname, '../migrations/20260923_application_messaging.sql'),
      'utf8',
    );
    await database.query(sql);
    const [{ messages }] = await database.query(
      'SELECT count(*)::int AS messages FROM "application_messages"',
    );
    console.log(
      `Applied application messaging migration. Existing application messages were preserved; database contains ${messages} messages.`,
    );
  } finally {
    await database.destroy();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
