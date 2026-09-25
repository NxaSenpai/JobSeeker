import { ConfigService } from '@nestjs/config';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Application } from './entities/application.entity';
import { Resume } from './entities/resume.entity';
import { ProfileService } from './profile.service';
import { ResumeService } from './resume.service';

describe('ResumeService', () => {
  let uploadDirectory: string;
  let repository: {
    countBy: jest.MockedFunction<
      (where: { profileId: string }) => Promise<number>
    >;
    create: jest.MockedFunction<(data: Partial<Resume>) => Resume>;
    save: jest.MockedFunction<(data: Resume) => Promise<Resume>>;
    find: jest.MockedFunction<(options: unknown) => Promise<Resume[]>>;
    findOne: jest.MockedFunction<(options: unknown) => Promise<Resume | null>>;
    update: jest.MockedFunction<
      (criteria: unknown, data: unknown) => Promise<void>
    >;
    delete: jest.MockedFunction<(criteria: unknown) => Promise<void>>;
  };
  let service: ResumeService;
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    role: UserRole.USER,
  } as User;

  beforeEach(() => {
    uploadDirectory = join(tmpdir(), `jobseeker-resume-test-${randomUUID()}`);
    const saveResume = (data: Resume): Promise<Resume> =>
      Promise.resolve({
        ...data,
        createdAt: data.createdAt ?? new Date(),
        updatedAt: data.updatedAt ?? new Date(),
      });
    repository = {
      countBy: jest
        .fn<(where: { profileId: string }) => Promise<number>>()
        .mockResolvedValue(0),
      create: jest.fn<(data: Partial<Resume>) => Resume>(
        (data) => data as Resume,
      ),
      save: jest.fn(saveResume),
      find: jest
        .fn<(options: unknown) => Promise<Resume[]>>()
        .mockResolvedValue([]),
      findOne: jest.fn<(options: unknown) => Promise<Resume | null>>(),
      update: jest.fn<(criteria: unknown, data: unknown) => Promise<void>>(),
      delete: jest.fn<(criteria: unknown) => Promise<void>>(),
    };
    const profiles = {
      getForUser: jest.fn().mockResolvedValue({ id: user.id }),
    } as unknown as ProfileService;
    const config = {
      get: jest.fn((key: string) =>
        key === 'RESUME_UPLOAD_DIR' ? uploadDirectory : undefined,
      ),
    } as unknown as ConfigService;
    const applications = {} as Repository<Application>;
    service = new ResumeService(
      repository as unknown as Repository<Resume>,
      applications,
      profiles,
      config,
    );
  });

  afterEach(async () => {
    await rm(uploadDirectory, { recursive: true, force: true });
  });

  it('stores a valid PDF under a private random key', async () => {
    const buffer = Buffer.from('%PDF-1.7\njobseeker test document');
    const file = {
      originalname: 'Tang Nakry CV.pdf',
      mimetype: 'application/pdf',
      size: buffer.length,
      buffer,
    } as Express.Multer.File;

    const result = await service.upload(user, file);
    const stored = repository.create.mock.calls[0][0] as Resume;

    expect(result.resume).toMatchObject({
      fileName: 'Tang Nakry CV.pdf',
      mimeType: 'application/pdf',
      fileSize: buffer.length,
      isDefault: true,
    });
    expect(result.resume).not.toHaveProperty('storageKey');
    expect(stored.storageKey).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    await expect(
      readFile(join(uploadDirectory, stored.storageKey)),
    ).resolves.toEqual(buffer);
  });

  it('rejects a file whose content is not a PDF', async () => {
    const buffer = Buffer.from('not really a pdf');

    await expect(
      service.upload(user, {
        originalname: 'fake.pdf',
        mimetype: 'application/pdf',
        size: buffer.length,
        buffer,
      } as Express.Multer.File),
    ).rejects.toThrow('Only PDF resumes are allowed.');

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects a PDF larger than 10 MB', async () => {
    const buffer = Buffer.from('%PDF-1.7');

    await expect(
      service.upload(user, {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 10 * 1024 * 1024 + 1,
        buffer,
      } as Express.Multer.File),
    ).rejects.toThrow('Your PDF must be 10 MB or smaller.');
  });

  it('does not open a resume owned by another profile', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.open(user, '22222222-2222-4222-8222-222222222222'),
    ).rejects.toThrow('Resume was not found.');
  });
});
