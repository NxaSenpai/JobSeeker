import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  Application,
  ApplicationStatus,
} from '../account/entities/application.entity';
import { ApplicationNote } from '../account/entities/application-note.entity';
import { Notification } from '../account/entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CompanyService } from './company.service';
import { CompanyApplicantsService } from './company-applicants.service';
import { EmailService } from '../email/email.service';
import { NotificationRealtimeService } from '../notifications/notification-realtime.service';

describe('CompanyApplicantsService', () => {
  const company = { id: 'company-1', ownerUserId: 'company-user-1' };
  const user = {
    id: 'company-user-1',
    role: UserRole.COMPANY,
  } as User;
  let service: CompanyApplicantsService;
  let companies: { ensureOwnProfile: jest.Mock };
  let applications: { createQueryBuilder: jest.Mock };
  let notes: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let transaction: jest.Mock;
  let managerSave: jest.Mock;
  let managerCreate: jest.Mock;
  let managerQueryBuilder: Record<string, jest.Mock>;
  let readQueryBuilder: Record<string, jest.Mock>;
  let activityEmail: jest.Mock;
  let realtimeNotifications: { publish: jest.Mock };
  let transactionCommitted: boolean;

  const makeApplication = (status = ApplicationStatus.APPLIED) =>
    ({
      id: 'application-1',
      userId: 'candidate-user-1',
      user: { email: 'ari@example.test' },
      jobId: 'product-designer',
      job: {
        id: 'product-designer',
        companyId: company.id,
        title: 'Product Designer',
        company: 'Example Company',
        location: 'Remote',
      },
      resume: {
        id: 'resume-1',
        fileName: 'cv.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storageKey: 'private-storage-key.pdf',
      },
      status,
      description: 'Candidate application statement',
      coverLetter: 'Cover letter',
      phone: '+855 12 345 678',
      portfolioUrl: 'https://portfolio.example',
      candidate: {
        userId: 'private-user-id',
        dateOfBirth: '1990-01-01',
        firstName: 'Ari',
        lastName: 'Candidate',
        email: 'ari@example.test',
        skills: ['TypeScript'],
        experience: [],
      },
      history: [
        { status: ApplicationStatus.APPLIED, at: '2026-01-01T00:00:00.000Z' },
      ],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }) as unknown as Application;

  beforeEach(() => {
    companies = { ensureOwnProfile: jest.fn().mockResolvedValue(company) };
    activityEmail = jest.fn().mockResolvedValue(true);
    transactionCommitted = false;
    realtimeNotifications = {
      publish: jest.fn(() => expect(transactionCommitted).toBe(true)),
    };
    readQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(makeApplication()),
    };
    applications = {
      createQueryBuilder: jest.fn(() => readQueryBuilder),
    };
    notes = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value: unknown) => value),
      save: jest.fn((value: unknown) => Promise.resolve(value)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    managerQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(makeApplication()),
    };
    managerSave = jest.fn((...values: unknown[]) =>
      Promise.resolve(values.at(-1)),
    );
    managerCreate = jest.fn((_entity: unknown, value: unknown) => value);
    const manager = {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => managerQueryBuilder),
      })),
      save: managerSave,
      create: managerCreate,
    };
    transaction = jest.fn(
      (callback: (value: typeof manager) => Promise<unknown>) =>
        callback(manager).then((result) => {
          transactionCommitted = true;
          return result;
        }),
    );

    service = new CompanyApplicantsService(
      { transaction } as unknown as DataSource,
      companies as unknown as CompanyService,
      { sendActivityEmail: activityEmail } as unknown as EmailService,
      realtimeNotifications as unknown as NotificationRealtimeService,
      applications as unknown as Repository<Application>,
      notes as unknown as Repository<ApplicationNote>,
    );
  });

  it('scopes application detail to the signed-in company and omits private storage and identity fields', async () => {
    const result = await service.get(user, 'application-1');

    expect(readQueryBuilder.andWhere).toHaveBeenCalledWith(
      'job.companyId = :companyId',
      { companyId: company.id },
    );
    expect(result.application.contact.email).toBe('ari@example.test');
    expect(result.application.candidate).not.toHaveProperty('userId');
    expect(result.application.candidate).not.toHaveProperty('dateOfBirth');
    expect(result.application.resume).not.toHaveProperty('storageKey');
    expect(result.application.resume.downloadUrl).toBe(
      '/api/v1/company/applications/application-1/resume',
    );
  });

  it('records an employer status change and candidate notification atomically under a row lock', async () => {
    const application = makeApplication();
    managerQueryBuilder.getOne.mockResolvedValue(application);

    const result = await service.updateStatus(user, application.id, {
      status: ApplicationStatus.SHORTLISTED,
    });

    expect(managerQueryBuilder.andWhere).toHaveBeenCalledWith(
      'job.companyId = :companyId',
      { companyId: company.id },
    );
    expect(managerQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    );
    expect(application.history.at(-1)).toMatchObject({
      status: ApplicationStatus.SHORTLISTED,
      changedBy: 'COMPANY',
    });
    expect(result.application.status).toBe(ApplicationStatus.SHORTLISTED);
    expect(managerCreate).toHaveBeenCalledWith(
      Notification,
      expect.objectContaining({ userId: application.userId, readAt: null }),
    );
    expect(realtimeNotifications.publish).toHaveBeenCalledWith(
      expect.objectContaining({ userId: application.userId }),
    );
    expect(managerSave).toHaveBeenCalledTimes(2);
    expect(activityEmail).toHaveBeenCalledWith(
      'ari@example.test',
      'APPLICATION_STATUS',
      `/applications/${application.id}`,
    );
  });

  it('does not send a duplicate status alert when the status is unchanged', async () => {
    managerQueryBuilder.getOne.mockResolvedValue(
      makeApplication(ApplicationStatus.SHORTLISTED),
    );

    await service.updateStatus(user, 'application-1', {
      status: ApplicationStatus.SHORTLISTED,
    });

    expect(managerSave).not.toHaveBeenCalled();
    expect(activityEmail).not.toHaveBeenCalled();
    expect(realtimeNotifications.publish).not.toHaveBeenCalled();
  });

  it('does not let an employer impersonate candidate-only application states', async () => {
    await expect(
      service.updateStatus(user, 'application-1', {
        status: ApplicationStatus.WITHDRAWN,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not allow a finalized rejected application to be reopened', async () => {
    managerQueryBuilder.getOne.mockResolvedValue(
      makeApplication(ApplicationStatus.REJECTED),
    );

    await expect(
      service.updateStatus(user, 'application-1', {
        status: ApplicationStatus.SHORTLISTED,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(managerSave).not.toHaveBeenCalled();
  });

  it('returns not found for an application outside the company even when its ID is known', async () => {
    readQueryBuilder.getOne.mockResolvedValue(null);

    await expect(
      service.get(user, 'other-company-application'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(readQueryBuilder.andWhere).toHaveBeenCalledWith(
      'job.companyId = :companyId',
      { companyId: company.id },
    );
  });
});
