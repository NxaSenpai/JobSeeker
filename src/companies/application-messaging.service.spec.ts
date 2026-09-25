import {
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Application } from '../account/entities/application.entity';
import { ApplicationMessage } from '../account/entities/application-message.entity';
import { Notification } from '../account/entities/notification.entity';
import { Company } from '../account/entities/company.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { CompanyService } from './company.service';
import { ApplicationMessagingService } from './application-messaging.service';
import { NotificationRealtimeService } from '../notifications/notification-realtime.service';

describe('ApplicationMessagingService', () => {
  const company = { id: 'company-1', ownerUserId: 'company-user-1' };
  const companyUser = {
    id: 'company-user-1',
    email: 'company@example.test',
    role: UserRole.COMPANY,
  } as User;
  const candidate = {
    id: 'candidate-user-1',
    email: 'candidate@example.test',
    role: UserRole.USER,
  } as User;
  let service: ApplicationMessagingService;
  let companies: { ensureOwnProfile: jest.Mock };
  let email: { sendActivityEmail: jest.Mock };
  let applications: { createQueryBuilder: jest.Mock };
  let messages: {
    update: jest.Mock;
    findAndCount: jest.Mock;
    countBy: jest.Mock;
  };
  let transaction: jest.Mock;
  let appQuery: Record<string, jest.Mock>;
  let rateQuery: Record<string, jest.Mock>;
  let manager: Record<string, jest.Mock>;
  let application: Application;
  let realtimeNotifications: { publish: jest.Mock };
  let transactionCommitted: boolean;

  beforeEach(() => {
    application = {
      id: 'application-1',
      userId: candidate.id,
      job: { id: 'job-1', companyId: company.id, isDemo: false },
    } as unknown as Application;
    companies = { ensureOwnProfile: jest.fn().mockResolvedValue(company) };
    email = { sendActivityEmail: jest.fn().mockResolvedValue(true) };
    transactionCommitted = false;
    realtimeNotifications = {
      publish: jest.fn(() => expect(transactionCommitted).toBe(true)),
    };
    appQuery = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(application),
    };
    rateQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };
    const created: Record<string, unknown>[] = [];
    manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Application) {
          return { createQueryBuilder: jest.fn(() => appQuery) };
        }
        if (entity === ApplicationMessage) {
          return { createQueryBuilder: jest.fn(() => rateQuery) };
        }
        return {};
      }),
      findOneBy: jest.fn((entity: unknown, where: Record<string, string>) => {
        if (entity === User && where.id === candidate.id) return candidate;
        if (entity === User && where.id === company.ownerUserId)
          return companyUser;
        if (entity === Company && where.id === company.id)
          return company as Company;
        return null;
      }),
      create: jest.fn((_entity: unknown, value: Record<string, unknown>) => {
        const item = {
          id: `created-${created.length + 1}`,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          ...value,
        };
        created.push(item);
        return item;
      }),
      save: jest.fn(
        (_entity: unknown, value: Record<string, unknown>) => value,
      ),
    };
    transaction = jest.fn(
      async (callback: (value: typeof manager) => Promise<unknown>) => {
        const result = await callback(manager);
        transactionCommitted = true;
        return result;
      },
    );
    applications = { createQueryBuilder: jest.fn(() => appQuery) };
    messages = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      countBy: jest.fn().mockResolvedValue(0),
    };
    service = new ApplicationMessagingService(
      {
        transaction,
        getRepository: jest.fn(() => ({
          findOneBy: jest.fn().mockResolvedValue(company),
        })),
      } as unknown as DataSource,
      companies as unknown as CompanyService,
      email as unknown as EmailService,
      realtimeNotifications as unknown as NotificationRealtimeService,
      applications as unknown as Repository<Application>,
      messages as unknown as Repository<ApplicationMessage>,
    );
  });

  it('derives the candidate recipient from the company-owned application and commits the alert with the message', async () => {
    const result = await service.sendFromCompany(companyUser, application.id, {
      body: 'Could you share your availability?',
    });

    expect(appQuery.andWhere).toHaveBeenCalledWith(
      'job.companyId = :companyId',
      { companyId: company.id },
    );
    expect(appQuery.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(manager.create).toHaveBeenCalledWith(
      ApplicationMessage,
      expect.objectContaining({
        applicationId: application.id,
        senderUserId: companyUser.id,
        recipientUserId: candidate.id,
      }),
    );
    expect(manager.create).toHaveBeenCalledWith(
      Notification,
      expect.objectContaining({ userId: candidate.id, readAt: null }),
    );
    expect(result.message).toMatchObject({ senderRole: 'COMPANY' });
    expect(realtimeNotifications.publish).toHaveBeenCalledWith(
      expect.objectContaining({ userId: candidate.id }),
    );
    expect(email.sendActivityEmail).toHaveBeenCalledWith(
      candidate.email,
      'APPLICATION_MESSAGE',
      `/applications/${application.id}?tab=messages`,
    );
    expect(email.sendActivityEmail.mock.calls[0]).not.toContain(
      'Could you share your availability?',
    );
  });

  it('derives the company recipient for a candidate and refuses a cross-company application', async () => {
    const result = await service.sendFromCandidate(candidate, application.id, {
      body: 'I have a question about the role.',
    });

    expect(result.message.senderRole).toBe('CANDIDATE');
    expect(email.sendActivityEmail).toHaveBeenCalledWith(
      companyUser.email,
      'APPLICATION_MESSAGE',
      `/company/applications/${application.id}?tab=messages`,
    );
    expect(manager.create).toHaveBeenCalledWith(
      ApplicationMessage,
      expect.objectContaining({ recipientUserId: companyUser.id }),
    );
    expect(realtimeNotifications.publish).not.toHaveBeenCalled();

    appQuery.getOne.mockResolvedValueOnce(null);
    await expect(
      service.sendFromCompany(companyUser, 'not-owned', { body: 'Hello' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(email.sendActivityEmail).toHaveBeenCalledTimes(1);
  });

  it('rejects demo applications and enforces a per-participant, per-thread send cap', async () => {
    application.job.isDemo = true;
    await expect(
      service.sendFromCompany(companyUser, application.id, { body: 'Hello' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();

    application.job.isDemo = false;
    rateQuery.getCount.mockResolvedValue(30);
    await expect(
      service.sendFromCompany(companyUser, application.id, { body: 'Hello' }),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(
      service.sendFromCompany(companyUser, application.id, { body: 'Hello' }),
    ).rejects.toMatchObject({ status: 429 });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('limits thread reads and read receipts to the signed-in participant', async () => {
    await service.markCandidateThreadRead(candidate, application.id);

    const [filter, update] = messages.update.mock.calls[0] as [
      Record<string, unknown>,
      { readAt: unknown },
    ];
    expect(filter).toMatchObject({
      applicationId: application.id,
      recipientUserId: candidate.id,
    });
    expect(update.readAt).toBeInstanceOf(Date);
  });
});
