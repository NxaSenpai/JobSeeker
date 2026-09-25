import { DataSource, EntityManager } from 'typeorm';
import { Company } from '../account/entities/company.entity';
import { Job, JobModerationStatus } from '../account/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { AdminOperationsService } from './admin-operations.service';
import { CompanyService } from './company.service';

describe('AdminOperationsService', () => {
  const actorId = '11111111-1111-4111-8111-111111111111';
  const targetId = '22222222-2222-4222-8222-222222222222';
  let service: AdminOperationsService;
  let transaction: jest.Mock;
  let findOne: jest.Mock;
  let managerSave: jest.Mock;
  let auditCreate: jest.Mock;
  let auditSave: jest.Mock;
  let auditRepository: { create: jest.Mock; save: jest.Mock };
  let manager: Record<string, jest.Mock>;

  beforeEach(() => {
    findOne = jest.fn();
    managerSave = jest.fn((entity: object) => Promise.resolve(entity));
    auditCreate = jest.fn((row: Record<string, unknown>) => row);
    auditSave = jest.fn((row: Record<string, unknown>) => Promise.resolve(row));
    auditRepository = { create: auditCreate, save: auditSave };
    manager = {
      findOne,
      save: managerSave,
      getRepository: jest.fn(() => auditRepository),
    };
    transaction = jest.fn((work: (manager: EntityManager) => unknown) =>
      work(manager as unknown as EntityManager),
    );
    const database = { transaction } as unknown as DataSource;
    const companyService = {
      present: jest.fn((company: { id: string; name: string }) => ({
        id: company.id,
        name: company.name,
      })),
    };
    service = new AdminOperationsService(
      database,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      companyService as unknown as CompanyService,
    );
  });

  it('suspends a user and writes the reason and audit event in one transaction', async () => {
    const user = {
      id: targetId,
      email: 'candidate@example.test',
      role: 'USER',
      suspendedAt: null,
      suspensionReason: null,
      sessionVersion: 0,
    } as unknown as User;
    findOne.mockResolvedValue(user);

    const result = await service.suspendUser(targetId, actorId, {
      reason: 'Repeated fraudulent applications',
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(user.suspendedAt).toBeInstanceOf(Date);
    expect(user.suspensionReason).toBe('Repeated fraudulent applications');
    expect(user.sessionVersion).toBe(1);
    expect(managerSave).toHaveBeenCalledWith(user);
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: actorId,
        action: 'USER_SUSPENDED',
        subjectType: 'USER',
        subjectId: targetId,
        metadata: { reason: 'Repeated fraudulent applications' },
      }),
    );
    expect(result.user.suspensionReason).toBe(
      'Repeated fraudulent applications',
    );
  });

  it('rejects self-suspension before opening a database transaction', async () => {
    await expect(
      service.suspendUser(actorId, actorId, { reason: 'Self lockout' }),
    ).rejects.toThrow('Admins cannot suspend their own account.');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not approve a company before its owner verifies email', async () => {
    const company = {
      id: targetId,
      ownerUserId: 'company-owner-id',
      isVerified: false,
      moderationNote: null,
    } as Company;
    findOne
      .mockResolvedValueOnce(company)
      .mockResolvedValueOnce({ emailVerified: false, suspendedAt: null });

    await expect(service.approveCompany(targetId, actorId)).rejects.toThrow(
      'The company owner must have a verified, active account before approval.',
    );
    expect(managerSave).not.toHaveBeenCalled();
    expect(auditSave).not.toHaveBeenCalled();
  });

  it('hides a job with a reason while retaining the job row', async () => {
    const job = {
      id: 'job-1',
      title: 'Suspicious remote role',
      company: 'Test Company',
      moderationStatus: JobModerationStatus.PENDING,
      moderationNote: null,
    } as Job;
    findOne.mockResolvedValue(job);

    const result = await service.hideJob('job-1', actorId, {
      reason: 'Listing asks applicants to pay a fee',
    });

    expect(job.moderationStatus).toBe(JobModerationStatus.HIDDEN);
    expect(job.moderationNote).toBe('Listing asks applicants to pay a fee');
    expect(managerSave).toHaveBeenCalledWith(job);
    expect(auditCreate).toHaveBeenCalledWith({
      actorUserId: actorId,
      action: 'JOB_HIDDEN',
      subjectType: 'JOB',
      subjectId: 'job-1',
      metadata: {
        previousStatus: JobModerationStatus.PENDING,
        moderationStatus: JobModerationStatus.HIDDEN,
        reason: 'Listing asks applicants to pay a fee',
      },
    });
    expect(result.job.moderationStatus).toBe(JobModerationStatus.HIDDEN);
  });
});
