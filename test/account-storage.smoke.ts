import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AccountController } from '../src/account/account.controller';
import { User, UserRole } from '../src/users/entities/user.entity';
import { SavedJob } from '../src/account/entities/saved-job.entity';
import { ApplicationDraft } from '../src/account/entities/application-draft.entity';
import type { SessionRequest } from '../src/auth/session.guard';

// Uses the configured schema, never synchronizes it, and rolls back every fixture.
// Does not call registration, email providers, or employer submission.
async function main() {
  try {
    process.loadEnvFile('.env');
  } catch {
    /* Environment may already be supplied. */
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const database = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, SavedJob, ApplicationDraft],
    synchronize: false,
    logging: false,
  });
  await database.initialize();
  const runner = database.createQueryRunner();
  const id = randomUUID();
  try {
    await runner.connect();
    await runner.startTransaction();
    const users = runner.manager.getRepository(User);
    const saved = runner.manager.getRepository(SavedJob);
    const drafts = runner.manager.getRepository(ApplicationDraft);
    const user = await users.save(
      users.create({
        id,
        email: 'account-smoke-' + id + '@example.invalid',
        firstName: 'Smoke',
        lastName: 'Test',
        passwordHash: 'not-a-login-password',
        role: UserRole.USER,
        emailVerified: true,
        termsAccepted: true,
      }),
    );
    const controller = new AccountController(users, saved, drafts);
    const own = { user } as SessionRequest;
    const other = { user: { ...user, id: randomUUID() } } as SessionRequest;
    const params = { jobId: 'product-designer' };
    const profile = await controller.updateProfile(own, {
      firstName: 'Updated',
      lastName: 'Test',
      headline: 'Designer',
      location: 'Phnom Penh',
      bio: 'Private profile test',
    });
    assert.equal(profile.user.firstName, 'Updated');
    assert.equal(profile.user.headline, 'Designer');
    await controller.saveJob(own, params);
    await controller.saveJob(own, params);
    assert.equal((await controller.savedJobs(own)).jobs.length, 1);
    assert.equal((await controller.savedJobs(other)).jobs.length, 0);
    await controller.unsaveJob(other, params);
    assert.equal((await controller.savedJobs(own)).jobs.length, 1);
    await controller.saveDraft(own, params, {
      coverLetter: 'First draft',
      resumeUrl: '',
    });
    await controller.saveDraft(own, params, {
      coverLetter: 'Updated draft',
      resumeUrl: 'https://example.com/resume.pdf',
    });
    const result = await controller.applicationDrafts(own);
    assert.equal(result.drafts.length, 1);
    assert.equal(result.drafts[0].coverLetter, 'Updated draft');
    assert.equal((await controller.applicationDrafts(other)).drafts.length, 0);
    await controller.deleteDraft(other, params);
    assert.equal((await controller.applicationDrafts(own)).drafts.length, 1);
    await controller.deleteDraft(own, params);
    await controller.unsaveJob(own, params);
    assert.equal((await controller.applicationDrafts(own)).drafts.length, 0);
    assert.equal((await controller.savedJobs(own)).jobs.length, 0);
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    const remaining = await database.getRepository(User).countBy({ id });
    await database.destroy();
    assert.equal(remaining, 0, 'Smoke-test fixture must be rolled back.');
  }
  console.log(
    'PASS: PostgreSQL profile, idempotent bookmarks, draft updates/deletes, ownership isolation. All fixtures rolled back.',
  );
}
void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Storage smoke test failed.',
  );
  process.exitCode = 1;
});
