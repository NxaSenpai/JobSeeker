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
      resolve(__dirname, '../migrations/20260924_abuse_reports.sql'),
      'utf8',
    );
    await database.query(sql);
    const reportRows: unknown = await database.query(
      'SELECT count(*)::int AS reports FROM "abuse_reports"',
    );
    if (!Array.isArray(reportRows) || reportRows.length !== 1) {
      throw new Error('Could not verify the abuse report table.');
    }
    const row: unknown = reportRows[0];
    if (typeof row !== 'object' || row === null || !('reports' in row)) {
      throw new Error('Could not verify the abuse report table.');
    }
    const schemaObjects: unknown = await database.query(`
      SELECT conname AS name
      FROM pg_constraint
      WHERE conrelid = 'abuse_reports'::regclass
      UNION
      SELECT indexname AS name
      FROM pg_indexes
      WHERE schemaname = current_schema() AND tablename = 'abuse_reports'
    `);
    if (!Array.isArray(schemaObjects)) {
      throw new Error('Could not verify abuse report constraints and indexes.');
    }
    const objectNames = new Set(
      schemaObjects.flatMap((item: unknown) => {
        if (
          typeof item === 'object' &&
          item !== null &&
          'name' in item &&
          typeof item.name === 'string'
        ) {
          return [item.name];
        }
        return [];
      }),
    );
    const requiredObjects = [
      'abuse_reports_reporterUserId_fkey',
      'abuse_reports_reviewedByUserId_fkey',
      'CHK_abuse_reports_subject_type',
      'CHK_abuse_reports_category',
      'CHK_abuse_reports_status',
      'CHK_abuse_reports_description',
      'CHK_abuse_reports_not_self',
      'CHK_abuse_reports_review_state',
      'UQ_abuse_reports_active_reporter_subject',
    ];
    const missingObjects = requiredObjects.filter(
      (name) => !objectNames.has(name),
    );
    if (missingObjects.length) {
      throw new Error(
        `Abuse reports schema is missing required objects: ${missingObjects.join(', ')}`,
      );
    }
    console.log(
      `Applied abuse reports migration and verified constraints/indexes. Existing reports were preserved; database contains ${Number(row.reports)} reports.`,
    );
  } finally {
    await database.destroy();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
