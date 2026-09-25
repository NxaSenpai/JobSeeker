import 'reflect-metadata';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { UserProfile } from '../src/account/entities/user-profile.entity';
import { Resume } from '../src/account/entities/resume.entity';
import {
  Application,
  ApplicationStatus,
} from '../src/account/entities/application.entity';
import { Company } from '../src/account/entities/company.entity';
import { Notification } from '../src/account/entities/notification.entity';

// Cast only at the HTTP boundary; the assertions below verify these fields.
function body(response: request.Response) {
  return response.body as {
    user: User;
    profile: UserProfile;
    resume: Resume;
    application: Application;
    applications: Application[];
    drafts: unknown[];
    total: number;
    history: Application['history'];
    notifications: Notification[];
    count: number;
    message: string;
  };
}
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import sharp from 'sharp';
import { AccountModule } from '../src/account/account.module';
import { CompanyModule } from '../src/companies/company.module';
import {
  Job,
  JobModerationStatus,
  JobStatus,
} from '../src/account/entities/job.entity';
import { User, UserRole } from '../src/users/entities/user.entity';
import { EmailService } from '../src/email/email.service';

// Real PostgreSQL + HTTP tests in a random isolated schema; no existing records
// are modified and no emails or messages are sent. All fixtures are removed.
async function main() {
  try {
    process.loadEnvFile('.env');
  } catch {
    /* Environment may be provided. */
  }
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('Set TEST_DATABASE_URL or DATABASE_URL.');
  const schema = `candidate_test_${randomUUID().replaceAll('-', '')}`;
  const directory = await mkdtemp(join(tmpdir(), 'jobseeker-candidate-'));
  process.env.RESUME_UPLOAD_DIR = join(directory, 'resumes');
  process.env.AVATAR_UPLOAD_DIR = join(directory, 'avatars');
  process.env.SEED_DEMO_JOBS = 'true';
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'candidate-smoke-only-not-a-production-secret';
  const control = new DataSource({ type: 'postgres', url });
  await control.initialize();
  let app: INestApplication<Server> | undefined;
  try {
    await control.query(`CREATE SCHEMA "${schema}"`);
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url,
          schema,
          autoLoadEntities: true,
          synchronize: true,
          logging: false,
        }),
        AccountModule,
        CompanyModule,
      ],
    })
      .overrideProvider(EmailService)
      .useValue({ sendActivityEmail: async () => undefined })
      .compile();
    app = module.createNestApplication();
    app.useLogger(['error']);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    const database = app.get(DataSource);
    const jwt = app.get(JwtService);
    const users = database.getRepository(User);
    const first = await users.save(
      users.create({
        email: 'first@example.invalid',
        firstName: 'Dara',
        lastName: 'Sok',
        role: UserRole.USER,
        emailVerified: true,
        passwordHash: 'fixture-only',
        termsAccepted: true,
      }),
    );
    const second = await users.save(
      users.create({
        email: 'second@example.invalid',
        firstName: 'Sophea',
        lastName: 'Chan',
        role: UserRole.USER,
        emailVerified: true,
        passwordHash: 'fixture-only',
        termsAccepted: true,
      }),
    );
    const company = await users.save(
      users.create({
        email: 'company@example.invalid',
        role: UserRole.COMPANY,
        emailVerified: true,
        passwordHash: 'fixture-only',
        termsAccepted: true,
      }),
    );
    const token = jwt.sign({ sub: first.id });
    const otherToken = jwt.sign({ sub: second.id });
    const companyToken = jwt.sign({ sub: company.id });
    const server = app.getHttpServer();
    const get = (path: string, auth = token) =>
      request(server).get(`/api/v1${path}`).auth(auth, { type: 'bearer' });
    const patch = (path: string, body = {}, auth = token) =>
      request(server)
        .patch(`/api/v1${path}`)
        .auth(auth, { type: 'bearer' })
        .send(body);
    const remove = (path: string, auth = token) =>
      request(server).delete(`/api/v1${path}`).auth(auth, { type: 'bearer' });
    await request(server).get('/api/v1/applications/me').expect(401);
    await get('/applications/me', companyToken).expect(403);
    const profileData = {
      firstName: 'Dara',
      lastName: 'Sok',
      headline: 'Frontend developer',
      phone: '+855 12 345 678',
      isOpenToWork: true,
      skills: ['Vue', 'TypeScript'],
      education: [
        {
          school: 'Royal University',
          degree: 'BSc',
          fieldOfStudy: 'Computer Science',
          startDate: '2020-01-01',
          endDate: '2024-01-01',
          description: 'Software engineering',
        },
      ],
      experience: [
        {
          company: 'Studio',
          position: 'Developer',
          employmentType: 'Full-time',
          startDate: '2024-02-01',
          endDate: '',
          current: true,
          description: 'Built accessible interfaces.',
        },
      ],
      languages: [{ name: 'Khmer', proficiency: 'Native' }],
    };
    await patch('/users/me', profileData).expect(200);
    await Promise.all([
      patch('/users/me', { headline: 'Vue developer' }).expect(200),
      patch('/users/me', { bio: 'I build accessible interfaces.' }).expect(200),
    ]);
    const profile = await get('/account/profile').expect(200);
    assert.equal(body(profile).profile.headline, 'Vue developer');
    assert.equal(body(profile).profile.bio, 'I build accessible interfaces.');
    assert.equal(body(profile).profile.education[0].school, 'Royal University');
    assert.equal(body(profile).user.firstName, 'Dara');
    assert.equal(body(profile).profile.experience[0].endDate, '');
    assert.equal(body(profile).profile.languages[0].proficiency, 'Native');
    assert.equal(body(profile).user.passwordHash, undefined);
    assert.equal(body(profile).profile.avatarKey, undefined);
    await patch('/users/me', { firstName: null }).expect(400);
    await patch('/users/me', { role: 'ADMIN' }).expect(400);
    await patch('/users/me', {
      education: [{ ...profileData.education[0], endDate: '2019-01-01' }],
    }).expect(400);
    await patch('/users/me', {
      languages: [{ name: 'Khmer', proficiency: 'Invalid' }],
    }).expect(400);
    await patch('/users/me', {
      education: [{ ...profileData.education[0], school: ' ' }],
    }).expect(400);
    const photo = await sharp({
      create: { width: 64, height: 64, channels: 3, background: '#705aef' },
    })
      .png()
      .toBuffer();
    await request(server)
      .post('/api/v1/users/me/avatar')
      .auth(token, { type: 'bearer' })
      .attach('file', photo, {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(201);
    await get('/account/profile/avatar')
      .expect('Content-Type', /image\/jpeg/)
      .expect(200);
    await get('/account/profile/avatar', otherToken).expect(404);
    await request(server)
      .post('/api/v1/users/me/avatar')
      .auth(token, { type: 'bearer' })
      .attach('file', Buffer.from('<svg></svg>'), {
        filename: 'bad.png',
        contentType: 'image/png',
      })
      .expect(400);
    const pdf = Buffer.from('%PDF-1.7\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');
    const uploaded = await request(server)
      .post('/api/v1/account/resumes')
      .auth(token, { type: 'bearer' })
      .attach('file', pdf, {
        filename: 'Dara CV.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const resumeId = body(uploaded).resume.id;
    assert.equal(body(uploaded).resume.storageKey, undefined);
    await get(`/account/resumes/${resumeId}/download`, otherToken).expect(404);
    const invalid = await request(server)
      .post('/api/v1/account/resumes')
      .auth(token, { type: 'bearer' })
      .attach('file', Buffer.from('fake'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      })
      .expect(415);
    assert.match(body(invalid).message, /Only PDF/);
    const payload = {
      resumeId,
      description:
        'I build accessible Vue interfaces and would love to contribute.',
      coverLetter: 'Here is my experience in product engineering.',
      phone: '+855 12 345 678',
      portfolioUrl: 'https://example.com',
      consent: true,
    };
    const submit = (job = 'product-designer', body = payload, auth = token) =>
      request(server)
        .post(`/api/v1/jobs/${job}/applications`)
        .auth(auth, { type: 'bearer' })
        .send(body);
    await submit('unknown-role').expect(404);
    await submit('product-designer', { ...payload, consent: false }).expect(
      400,
    );
    await submit('product-designer', {
      ...payload,
      description: 'short',
    }).expect(400);
    await submit('product-designer', payload, otherToken).expect(404);
    await submit('product-designer', payload, companyToken).expect(403);
    await database
      .getRepository(Job)
      .update('growth-marketer', { deadline: new Date('2020-01-01') });
    await submit('growth-marketer').expect(400);
    await database
      .getRepository(Job)
      .update('content-strategist', { status: JobStatus.CLOSED });
    await submit('content-strategist').expect(404);
    await request(server)
      .put('/api/v1/account/application-drafts/product-designer')
      .auth(token, { type: 'bearer' })
      .send({ ...payload, consent: undefined, resumeUrl: '' })
      .expect(200);
    const submitted = await submit().expect(201);
    const id = body(submitted).application.id;
    assert.equal(body(submitted).application.status, 'APPLIED');
    assert.equal(body(submitted).application.job.isDemo, true);
    assert.equal(body(submitted).application.resume.storageKey, undefined);
    assert.equal(
      body(submitted).application.candidate.phone,
      profileData.phone,
    );
    await submit().expect(409);
    // A race must still produce exactly one application and one conflict.
    const concurrent = await Promise.all([
      submit('full-stack-engineer'),
      submit('full-stack-engineer'),
    ]);
    assert.deepEqual(
      concurrent.map((result) => result.status).sort(),
      [201, 409],
    );
    const drafts = await get('/account/application-drafts').expect(200);
    assert.equal(body(drafts).drafts.length, 0);
    await get(`/applications/me/${id}`, otherToken).expect(404);
    await patch(`/applications/me/${id}/withdraw`, {}, otherToken).expect(404);
    assert.equal(
      body(await get('/applications/me', otherToken).expect(200)).total,
      0,
    );
    assert.equal(
      body(await get('/applications/me?limit=1').expect(200)).applications
        .length,
      1,
    );
    assert.equal(
      body(await get('/applications/me?jobId=product-designer').expect(200))
        .total,
      1,
    );
    await get('/applications/me?limit=1000').expect(400);
    await remove(`/account/resumes/${resumeId}`).expect(409);
    await get(`/account/resumes/${resumeId}/download`).expect(200);
    await patch('/users/me', { firstName: 'Changed' }).expect(200);
    assert.equal(
      body(await get(`/applications/me/${id}`).expect(200)).application
        .candidate.firstName,
      'Dara',
    );
    await patch(`/applications/me/${id}/withdraw`).expect(200);
    await patch(`/applications/me/${id}/withdraw`).expect(200);
    const history = await get(`/applications/me/${id}/history`).expect(200);
    assert.deepEqual(
      body(history).history.map((item: { status: string }) => item.status),
      ['APPLIED', 'WITHDRAWN'],
    );
    assert.equal(
      body(await get('/applications/me?status=WITHDRAWN').expect(200)).total,
      1,
    );
    const notifications = await get('/notifications').expect(200);
    assert.equal(body(notifications).total, 3);
    await patch(
      `/notifications/${body(notifications).notifications[0].id}/read`,
      {},
      otherToken,
    ).expect(404);
    await patch('/notifications/read-all').expect(200);
    assert.equal(
      body(await get('/notifications/unread-count').expect(200)).count,
      0,
    );
    await remove('/account/profile/avatar').expect(200);
    await get('/account/profile/avatar').expect(404);

    // Exercise the real employer applicant API and PostgreSQL status/notice
    // writes, using only fixtures in this disposable schema.
    const companies = database.getRepository(Company);
    const companyProfile = await companies.save(
      companies.create({
        ownerUserId: company.id,
        name: 'Integration Company',
        slug: `integration-company-${randomUUID().slice(0, 8)}`,
        isVerified: true,
        isDemo: false,
        socialLinks: {},
      }),
    );
    const jobs = database.getRepository(Job);
    const companyJob = await jobs.save(
      jobs.create({
        id: `integration-role-${randomUUID()}`,
        companyId: companyProfile.id,
        title: 'Integration Test Engineer',
        company: companyProfile.name,
        location: 'Phnom Penh, Cambodia',
        status: JobStatus.PUBLISHED,
        moderationStatus: JobModerationStatus.APPROVED,
        isDemo: false,
      }),
    );
    const companyApplicationResponse = await submit(companyJob.id).expect(201);
    const companyApplicationId =
      body(companyApplicationResponse).application.id;
    const employerQueue = await get('/company/applications', companyToken).expect(
      200,
    );
    const employerQueueBody = employerQueue.body as {
      applications: Array<{ id: string; status: ApplicationStatus }>;
      total: number;
    };
    assert.equal(employerQueueBody.total, 1);
    assert.equal(employerQueueBody.applications[0].id, companyApplicationId);
    assert.equal(
      employerQueueBody.applications[0].status,
      ApplicationStatus.APPLIED,
    );

    const statusUpdate = await patch(
      `/company/applications/${companyApplicationId}/status`,
      { status: ApplicationStatus.SHORTLISTED },
      companyToken,
    ).expect(200);
    assert.equal(
      body(statusUpdate).application.status,
      ApplicationStatus.SHORTLISTED,
    );
    const companyHistory = await get(
      `/applications/me/${companyApplicationId}/history`,
    ).expect(200);
    assert.deepEqual(
      body(companyHistory).history.map((item: { status: string }) => item.status),
      [ApplicationStatus.APPLIED, ApplicationStatus.SHORTLISTED],
    );
    const candidateNotifications = body(
      await get('/notifications').expect(200),
    ).notifications;
    assert.ok(
      candidateNotifications.some(
        (item) =>
          item.title === 'Application status updated' &&
          item.message.includes('shortlisted'),
      ),
    );
    console.log(
      'PASS: PostgreSQL seeker application and employer review flow, including ownership, status history, and persisted candidate notification.',
    );
  } finally {
    if (app) await app.close();
    assert.match(schema, /^candidate_test_[a-f0-9]{32}$/);
    await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await control.destroy();
    const target = resolve(directory);
    assert.ok(
      target.startsWith(resolve(tmpdir()) + sep) &&
        target.split(sep).at(-1)?.startsWith('jobseeker-candidate-'),
    );
    await rm(target, { recursive: true, force: true });
    console.log('Removed the isolated test schema and temporary test uploads.');
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
