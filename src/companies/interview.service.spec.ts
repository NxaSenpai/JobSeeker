import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  Application,
  ApplicationStatus,
} from '../account/entities/application.entity';
import {
  Interview,
  InterviewStatus,
  InterviewType,
} from '../account/entities/interview.entity';
import { Notification } from '../account/entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CompanyService } from './company.service';
import { InterviewService } from './interview.service';
import { EmailService } from '../email/email.service';
import { NotificationRealtimeService } from '../notifications/notification-realtime.service';

describe('InterviewService', () => {
  const company = { id: 'company-1' };
  const user = { id: 'company-user-1', role: UserRole.COMPANY } as User;
  let service: InterviewService;
  let companies: { ensureOwnProfile: jest.Mock };
  let interviews: { createQueryBuilder: jest.Mock };
  let transaction: jest.Mock;
  let managerSave: jest.Mock;
  let managerCreate: jest.Mock;
  let queryBuilder: Record<string, jest.Mock>;
  let application: Application;
  let activityEmail: jest.Mock;
  let realtimeNotifications: { publish: jest.Mock };
  let transactionCommitted: boolean;

  beforeEach(() => {
    application = {
      id: 'application-1',
      userId: 'candidate-1',
      status: ApplicationStatus.APPLIED,
      history: [
        { status: ApplicationStatus.APPLIED, at: '2026-01-01T00:00:00.000Z' },
      ],
      user: { id: 'candidate-1', email: 'candidate@example.test' },
      candidate: { firstName: 'Sam', lastName: 'Applicant' },
      job: {
        id: 'job-1',
        companyId: company.id,
        title: 'Engineer',
        company: 'Example Co',
      },
    } as unknown as Application;
    companies = { ensureOwnProfile: jest.fn().mockResolvedValue(company) };
    interviews = { createQueryBuilder: jest.fn() };
    queryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(application),
    };
    managerSave = jest.fn((...values: unknown[]) =>
      Promise.resolve(values.at(-1)),
    );
    activityEmail = jest.fn().mockResolvedValue(true);
    transactionCommitted = false;
    realtimeNotifications = {
      publish: jest.fn(() => expect(transactionCommitted).toBe(true)),
    };
    managerCreate = jest.fn(
      (entity: unknown, value: Record<string, unknown>) =>
        entity === Interview
          ? {
              id: 'interview-1',
              createdAt: new Date(),
              updatedAt: new Date(),
              ...value,
            }
          : value,
    );
    const manager = {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => queryBuilder),
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
    service = new InterviewService(
      { transaction } as unknown as DataSource,
      companies as unknown as CompanyService,
      { sendActivityEmail: activityEmail } as unknown as EmailService,
      realtimeNotifications as unknown as NotificationRealtimeService,
      interviews as unknown as Repository<Interview>,
    );
  });

  it('schedules an interview, advances an active application, and notifies the candidate atomically', async () => {
    const result = await service.schedule(user, application.id, {
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      type: InterviewType.ONLINE,
      meetingUrl: 'https://meet.example.test/room',
      notes: 'Please join a few minutes early.',
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'job.companyId = :companyId',
      { companyId: company.id },
    );
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(application.status).toBe(ApplicationStatus.INTERVIEW);
    expect(application.history.at(-1)).toMatchObject({
      status: ApplicationStatus.INTERVIEW,
      changedBy: 'COMPANY',
    });
    expect(result.interview.status).toBe(InterviewStatus.SCHEDULED);
    expect(managerCreate).toHaveBeenCalledWith(
      Notification,
      expect.objectContaining({ userId: application.userId, readAt: null }),
    );
    expect(realtimeNotifications.publish).toHaveBeenCalledWith(
      expect.objectContaining({ userId: application.userId }),
    );
    expect(managerSave).toHaveBeenCalledTimes(3);
    expect(activityEmail).toHaveBeenCalledWith(
      'candidate@example.test',
      'INTERVIEW_SCHEDULED',
      `/applications/${application.id}?tab=interviews`,
    );
  });

  it('does not schedule against another company application', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(
      service.schedule(user, 'other-company-application', {
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        type: InterviewType.PHONE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(managerSave).not.toHaveBeenCalled();
  });

  it('requires a safe HTTPS meeting URL for online interviews', async () => {
    await expect(
      service.schedule(user, application.id, {
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        type: InterviewType.ONLINE,
        meetingUrl: 'https://user:password@meet.example.test/room',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('requires an explicit timezone and future time', async () => {
    await expect(
      service.schedule(user, application.id, {
        scheduledAt: '2030-01-01T09:00:00',
        type: InterviewType.PHONE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
