import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AccountController } from './account.controller';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { SessionGuard } from '../auth/session.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { SavedJob } from './entities/saved-job.entity';
import { ApplicationDraft } from './entities/application-draft.entity';

describe('Authenticated account HTTP endpoints', () => {
  let app: INestApplication<Server>;
  let jwt: JwtService;
  const firstId = '11111111-1111-4111-8111-111111111111';
  const secondId = '22222222-2222-4222-8222-222222222222';
  let users: Map<string, Record<string, unknown>>;
  let saved: ReturnType<typeof activityRepository>;
  let drafts: ReturnType<typeof activityRepository>;

  function activityRepository() {
    const rows = new Map<string, Record<string, unknown>>();
    const key = (data: Record<string, unknown>) =>
      String(data.userId) + ':' + String(data.jobId);
    return {
      rows,
      find: jest.fn(({ where }: { where: { userId: string } }) =>
        [...rows.values()].filter((row) => row.userId === where.userId),
      ),
      upsert: jest.fn((data: Record<string, unknown>) => {
        rows.set(key(data), { ...data, updatedAt: new Date().toISOString() });
      }),
      findOneByOrFail: jest.fn((where: Record<string, unknown>) =>
        rows.get(key(where)),
      ),
      delete: jest.fn((where: Record<string, unknown>) => {
        rows.delete(key(where));
      }),
    };
  }
  const token = (id = firstId, claims = {}) =>
    jwt.sign({ sub: id, role: 'USER', ...claims }, { expiresIn: '1h' });
  const profile = {
    firstName: '  Dara  ',
    lastName: 'Sok',
    headline: 'Designer',
    location: 'Phnom Penh',
    bio: 'My profile',
  };
  const draft = {
    coverLetter: 'Hello team',
    resumeUrl: 'https://example.com/resume.pdf',
  };

  beforeEach(async () => {
    users = new Map(
      [firstId, secondId].map((id) => [
        id,
        {
          id,
          email: id + '@example.invalid',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.USER,
          emailVerified: true,
          passwordHash: 'must-never-be-returned',
        },
      ]),
    );
    saved = activityRepository();
    drafts = activityRepository();
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'account-test-only-signing-secret',
          signOptions: { algorithm: 'HS256' },
        }),
      ],
      controllers: [AuthController, AccountController],
      providers: [
        SessionGuard,
        { provide: AuthService, useValue: {} },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: ({ where }: { where: { id: string } }) =>
              users.get(where.id),
            findOneByOrFail: ({ id }: { id: string }) => users.get(id),
            update: (id: string, data: Record<string, unknown>) =>
              users.set(id, { ...users.get(id), ...data }),
          },
        },
        { provide: getRepositoryToken(SavedJob), useValue: saved },
        { provide: getRepositoryToken(ApplicationDraft), useValue: drafts },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    jwt = module.get(JwtService);
  });
  afterEach(async () => {
    await app.close();
  });

  it('requires a token on session and account endpoints', async () => {
    for (const path of [
      'auth/me',
      'account/saved-jobs',
      'account/application-drafts',
    ]) {
      await request(app.getHttpServer())
        .get('/api/v1/' + path)
        .expect(401);
    }
  });
  it('rejects forged, expired, non-expiring, and malformed-subject tokens', async () => {
    const bad = [
      new JwtService({ secret: 'wrong-secret' }).sign(
        { sub: firstId },
        { expiresIn: '1h' },
      ),
      jwt.sign({ sub: firstId }, { expiresIn: -1 }),
      jwt.sign({ sub: firstId }),
      token('------------------------------------'),
    ];
    for (const value of bad)
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .auth(value, { type: 'bearer' })
        .expect(401);
  });
  it('rejects unverified and deleted accounts', async () => {
    users.get(firstId)!.emailVerified = false;
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(token(), { type: 'bearer' })
      .expect(401);
    users.delete(firstId);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(token(), { type: 'bearer' })
      .expect(401);
  });
  it('returns only public fields and updates the authenticated profile', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/account/profile')
      .auth(token(), { type: 'bearer' })
      .send(profile)
      .expect(200);
    expect(
      (response.body as { user: Record<string, unknown> }).user.firstName,
    ).toBe('Dara');
    expect(
      (response.body as { user: Record<string, unknown> }).user.passwordHash,
    ).toBeUndefined();
    expect(users.get(secondId)!.firstName).toBe('Test');
    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(token(), { type: 'bearer' })
      .expect(200);
    expect((me.body as { user: Record<string, unknown> }).user.headline).toBe(
      'Designer',
    );
    expect(
      (me.body as { user: Record<string, unknown> }).user.passwordHash,
    ).toBeUndefined();
  });
  it('rejects role escalation, email changes, and blank names', async () => {
    for (const data of [
      { ...profile, role: 'ADMIN' },
      { ...profile, userId: secondId },
      { ...profile, email: 'another@example.invalid' },
      { ...profile, firstName: ' ' },
    ]) {
      await request(app.getHttpServer())
        .patch('/api/v1/account/profile')
        .auth(token(), { type: 'bearer' })
        .send(data)
        .expect(400);
    }
  });
  it.each([UserRole.COMPANY, UserRole.ADMIN])(
    'uses the database role to block %s job seeker actions',
    async (role) => {
      users.get(firstId)!.role = role;
      await request(app.getHttpServer())
        .put('/api/v1/account/saved-jobs/product-designer')
        .auth(token(), { type: 'bearer' })
        .expect(403);
      await request(app.getHttpServer())
        .put('/api/v1/account/application-drafts/product-designer')
        .auth(token(), { type: 'bearer' })
        .send(draft)
        .expect(403);
      await request(app.getHttpServer())
        .patch('/api/v1/account/profile')
        .auth(token(), { type: 'bearer' })
        .send(profile)
        .expect(403);
      expect(saved.upsert).not.toHaveBeenCalled();
    },
  );
  it('saves idempotently and isolates bookmarks between users', async () => {
    for (let i = 0; i < 2; i++)
      await request(app.getHttpServer())
        .put('/api/v1/account/saved-jobs/product-designer')
        .auth(token(), { type: 'bearer' })
        .expect(200);
    expect(saved.rows.size).toBe(1);
    const other = await request(app.getHttpServer())
      .get('/api/v1/account/saved-jobs')
      .auth(token(secondId), { type: 'bearer' })
      .expect(200);
    expect((other.body as { jobs: unknown[] }).jobs).toEqual([]);
    await request(app.getHttpServer())
      .delete('/api/v1/account/saved-jobs/product-designer')
      .auth(token(secondId), { type: 'bearer' })
      .expect(200);
    expect(saved.rows.size).toBe(1);
    await request(app.getHttpServer())
      .delete('/api/v1/account/saved-jobs/product-designer')
      .auth(token(), { type: 'bearer' })
      .expect(200);
    expect(saved.rows.size).toBe(0);
  });
  it('keeps drafts private, supports updates, and only deletes the owners draft', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/account/application-drafts/product-designer')
      .auth(token(), { type: 'bearer' })
      .send(draft)
      .expect(200);
    await request(app.getHttpServer())
      .put('/api/v1/account/application-drafts/product-designer')
      .auth(token(), { type: 'bearer' })
      .send({ ...draft, coverLetter: 'Updated' })
      .expect(200);
    const own = await request(app.getHttpServer())
      .get('/api/v1/account/application-drafts')
      .auth(token(), { type: 'bearer' })
      .expect(200);
    expect(
      (own.body as { drafts: { coverLetter: string }[] }).drafts,
    ).toHaveLength(1);
    expect(
      (own.body as { drafts: { coverLetter: string }[] }).drafts[0].coverLetter,
    ).toBe('Updated');
    const other = await request(app.getHttpServer())
      .get('/api/v1/account/application-drafts')
      .auth(token(secondId), { type: 'bearer' })
      .expect(200);
    expect((other.body as { drafts: unknown[] }).drafts).toEqual([]);
    await request(app.getHttpServer())
      .delete('/api/v1/account/application-drafts/product-designer')
      .auth(token(secondId), { type: 'bearer' })
      .expect(200);
    expect(drafts.rows.size).toBe(1);
    await request(app.getHttpServer())
      .delete('/api/v1/account/application-drafts/product-designer')
      .auth(token(), { type: 'bearer' })
      .expect(200);
    expect(drafts.rows.size).toBe(0);
  });
  it('validates job IDs, draft length, and HTTPS resume links', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/account/saved-jobs/invalid_id')
      .auth(token(), { type: 'bearer' })
      .expect(400);
    for (const data of [
      { ...draft, resumeUrl: 'javascript:alert(1)' },
      { ...draft, resumeUrl: 'http://example.com' },
      { ...draft, coverLetter: 'x'.repeat(10001) },
      { ...draft, userId: secondId },
      { ...draft, resumeUrl: null },
    ]) {
      await request(app.getHttpServer())
        .put('/api/v1/account/application-drafts/product-designer')
        .auth(token(), { type: 'bearer' })
        .send(data)
        .expect(400);
    }
    await request(app.getHttpServer())
      .put('/api/v1/account/application-drafts/product-designer')
      .auth(token(), { type: 'bearer' })
      .send({ coverLetter: '', resumeUrl: '' })
      .expect(200);
  });
});
