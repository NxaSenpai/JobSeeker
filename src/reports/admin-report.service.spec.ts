import { DataSource, EntityManager, Repository } from 'typeorm';
import { Company } from '../account/entities/company.entity';
import { Job } from '../account/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../companies/audit-log.entity';
import {
  AbuseReport,
  ReportCategory,
  ReportStatus,
  ReportSubjectType,
} from './entities/abuse-report.entity';
import { AdminReportService } from './admin-report.service';

describe('AdminReportService', () => {
  const reportId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const actorId = '11111111-1111-4111-8111-111111111111';
  const targetJobId = 'frontend-designer-1';
  const report = {
    id: reportId,
    reporterUserId: '22222222-2222-4222-8222-222222222222',
    reporter: {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'reporter@example.test',
      role: 'USER',
    },
    subjectType: ReportSubjectType.JOB,
    subjectId: targetJobId,
    category: ReportCategory.SCAM,
    description: 'This listing asks applicants to pay to apply.',
    status: ReportStatus.IN_REVIEW,
    reviewedByUserId: actorId,
    reviewedBy: { id: actorId, email: 'admin@example.test' },
    reviewedAt: new Date('2026-09-24T00:00:00.000Z'),
    resolutionNote: null,
    createdAt: new Date('2026-09-23T00:00:00.000Z'),
    updatedAt: new Date('2026-09-24T00:00:00.000Z'),
  } as AbuseReport;
  let service: AdminReportService;
  let transaction: jest.Mock;
  let managerFindOne: jest.Mock;
  let managerSave: jest.Mock;
  let auditCreate: jest.Mock;
  let auditSave: jest.Mock;
  let reports: { findOne: jest.Mock };
  let jobs: { find: jest.Mock };

  beforeEach(() => {
    managerFindOne = jest.fn();
    managerSave = jest.fn((row: AbuseReport) => Promise.resolve(row));
    auditCreate = jest.fn((row: AuditLog) => row);
    auditSave = jest.fn((row: AuditLog) => Promise.resolve(row));
    const auditRepository = { create: auditCreate, save: auditSave };
    const manager = {
      findOne: managerFindOne,
      save: managerSave,
      getRepository: jest.fn(() => auditRepository),
    };
    transaction = jest.fn((work: (manager: EntityManager) => unknown) =>
      work(manager as unknown as EntityManager),
    );
    reports = { findOne: jest.fn().mockResolvedValue(report) };
    jobs = {
      find: jest.fn().mockResolvedValue([
        {
          id: targetJobId,
          title: 'Frontend Designer',
          company: 'Example Studio',
          companyProfile: null,
          status: 'PUBLISHED',
          moderationStatus: 'APPROVED',
          description: 'Role description',
          createdAt: new Date('2026-09-20T00:00:00.000Z'),
          deadline: null,
        },
      ]),
    };
    service = new AdminReportService(
      { transaction } as unknown as DataSource,
      reports as unknown as Repository<AbuseReport>,
      {} as Repository<User>,
      {} as Repository<Company>,
      jobs as unknown as Repository<Job>,
    );
  });

  it('resolves a report and writes the admin decision to the audit log', async () => {
    managerFindOne.mockResolvedValue(report);

    const result = await service.resolve(reportId, actorId, {
      note: 'Reviewed evidence and hid the scam listing.',
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(report.status).toBe(ReportStatus.RESOLVED);
    expect(report.resolutionNote).toBe(
      'Reviewed evidence and hid the scam listing.',
    );
    expect(managerSave).toHaveBeenCalledWith(report);
    expect(auditCreate).toHaveBeenCalledWith({
      actorUserId: actorId,
      action: 'REPORT_RESOLVED',
      subjectType: 'REPORT',
      subjectId: reportId,
      metadata: {
        previousStatus: ReportStatus.IN_REVIEW,
        status: ReportStatus.RESOLVED,
        reportedSubjectType: ReportSubjectType.JOB,
        reportedSubjectId: targetJobId,
        resolutionNote: 'Reviewed evidence and hid the scam listing.',
      },
    });
    expect(result.report.subject).toEqual(
      expect.objectContaining({ title: 'Frontend Designer' }),
    );
    expect(result.report.reviewedBy.email).toBe('admin@example.test');
  });
});
