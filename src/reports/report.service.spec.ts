import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  AbuseReport,
  ReportCategory,
  ReportStatus,
  ReportSubjectType,
} from './entities/abuse-report.entity';
import { ReportService } from './report.service';

describe('ReportService', () => {
  const reporterId = '11111111-1111-4111-8111-111111111111';
  const reporter = { id: reporterId } as User;
  let service: ReportService;
  let transaction: jest.Mock;
  let manager: {
    findOne: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    manager = {
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((_entity: unknown, data: unknown) => data),
      save: jest.fn((row: AbuseReport) =>
        Promise.resolve({
          ...row,
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    };
    transaction = jest.fn((work: (manager: EntityManager) => unknown) =>
      work(manager as unknown as EntityManager),
    );
    service = new ReportService(
      { transaction } as unknown as DataSource,
      {} as Repository<AbuseReport>,
    );
  });

  it('creates a report using the signed-in reporter and validates the target', async () => {
    manager.findOne
      .mockResolvedValueOnce(reporter)
      .mockResolvedValueOnce({ id: 'suspicious-role' });

    const result = await service.submit(reporter, {
      subjectType: ReportSubjectType.JOB,
      subjectId: ' suspicious-role ',
      category: ReportCategory.SCAM,
      description: 'This listing requests an upfront payment from applicants.',
    });

    expect(manager.findOne).toHaveBeenNthCalledWith(
      1,
      User,
      expect.objectContaining({
        where: { id: reporterId },
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(manager.count).toHaveBeenCalledTimes(1);
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterUserId: reporterId,
        subjectType: ReportSubjectType.JOB,
        subjectId: 'suspicious-role',
        category: ReportCategory.SCAM,
        status: ReportStatus.OPEN,
      }),
    );
    expect(result.report.subjectId).toBe('suspicious-role');
    expect(result.report.status).toBe(ReportStatus.OPEN);
    expect(result.report).not.toHaveProperty('reporterUserId');
  });

  it('rejects reports about the reporter account itself', async () => {
    await expect(
      service.submit(reporter, {
        subjectType: ReportSubjectType.USER,
        subjectId: reporterId,
        category: ReportCategory.OTHER,
        description: 'This report targets my own account by mistake.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rate-limits submissions under a locked reporter row', async () => {
    manager.findOne.mockResolvedValueOnce(reporter);
    manager.count.mockResolvedValue(5);

    await expect(
      service.submit(reporter, {
        subjectType: ReportSubjectType.JOB,
        subjectId: 'job-1',
        category: ReportCategory.OTHER,
        description:
          'The details of this report are intentionally long enough.',
      }),
    ).rejects.toMatchObject({ status: 429 });
    expect(manager.count).toHaveBeenCalledTimes(1);
    expect(manager.findOne).toHaveBeenCalledWith(
      User,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('maps a duplicate active-report constraint to a conflict response', async () => {
    manager.findOne
      .mockResolvedValueOnce(reporter)
      .mockResolvedValueOnce({ id: 'job-1' });
    manager.save.mockRejectedValueOnce(
      Object.assign(new Error(), { code: '23505' }),
    );

    await expect(
      service.submit(reporter, {
        subjectType: ReportSubjectType.JOB,
        subjectId: 'job-1',
        category: ReportCategory.SCAM,
        description:
          'This listing requests an upfront payment from applicants.',
      }),
    ).rejects.toThrow('You already have an active report for this item.');
  });
});
