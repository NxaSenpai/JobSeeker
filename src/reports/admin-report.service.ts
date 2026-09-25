import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Company } from '../account/entities/company.entity';
import { Job } from '../account/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../companies/audit-log.entity';
import { AdminReportsQueryDto, ReportResolutionDto } from './report.dto';
import {
  AbuseReport,
  ReportStatus,
  ReportSubjectType,
} from './entities/abuse-report.entity';

@Injectable()
export class AdminReportService {
  constructor(
    private readonly database: DataSource,
    @InjectRepository(AbuseReport)
    private readonly reports: Repository<AbuseReport>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Company)
    private readonly companies: Repository<Company>,
    @InjectRepository(Job)
    private readonly jobs: Repository<Job>,
  ) {}

  async list(query: AdminReportsQueryDto) {
    const builder = this.reports
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.reviewedBy', 'reviewer');
    if (query.status) {
      builder.andWhere('report.status = :status', { status: query.status });
    } else {
      builder.andWhere('report.status IN (:...statuses)', {
        statuses: [ReportStatus.OPEN, ReportStatus.IN_REVIEW],
      });
    }
    if (query.subjectType)
      builder.andWhere('report.subjectType = :subjectType', {
        subjectType: query.subjectType,
      });
    if (query.category)
      builder.andWhere('report.category = :category', {
        category: query.category,
      });
    if (query.search?.trim()) {
      builder.andWhere(
        '(report.subjectId ILIKE :search OR report.description ILIKE :search OR report.category ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }
    const [reports, total] = await builder
      .orderBy('report.createdAt', 'ASC')
      .addOrderBy('report.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      reports: await this.presentForAdmin(reports),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async get(id: string) {
    const report = await this.reports.findOne({
      where: { id },
      relations: { reporter: true, reviewedBy: true },
    });
    if (!report) throw new NotFoundException('Report was not found.');
    const [presented] = await this.presentForAdmin([report]);
    return { report: presented };
  }

  async startReview(id: string, actorUserId: string) {
    await this.transition(id, actorUserId, ReportStatus.IN_REVIEW);
    return this.get(id);
  }

  async resolve(id: string, actorUserId: string, dto: ReportResolutionDto) {
    await this.transition(id, actorUserId, ReportStatus.RESOLVED, dto.note);
    return this.get(id);
  }

  async dismiss(id: string, actorUserId: string, dto: ReportResolutionDto) {
    await this.transition(id, actorUserId, ReportStatus.DISMISSED, dto.note);
    return this.get(id);
  }

  private async transition(
    id: string,
    actorUserId: string,
    nextStatus: ReportStatus,
    resolutionNote?: string,
  ) {
    return this.database.transaction(async (manager) => {
      const report = await manager.findOne(AbuseReport, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!report) throw new NotFoundException('Report was not found.');
      const previousStatus = report.status;

      if (nextStatus === ReportStatus.IN_REVIEW) {
        if (report.status === ReportStatus.IN_REVIEW) return;
        if (report.status !== ReportStatus.OPEN) {
          throw new ConflictException('A closed report cannot be reopened.');
        }
        report.status = ReportStatus.IN_REVIEW;
        report.reviewedByUserId = actorUserId;
        report.reviewedAt = new Date();
      } else {
        if (
          report.status !== ReportStatus.OPEN &&
          report.status !== ReportStatus.IN_REVIEW
        ) {
          throw new ConflictException('This report has already been closed.');
        }
        report.status = nextStatus;
        report.reviewedByUserId = actorUserId;
        report.reviewedAt = new Date();
        report.resolutionNote = resolutionNote ?? null;
      }

      await manager.save(report);
      const audit = manager.getRepository(AuditLog);
      await audit.save(
        audit.create({
          actorUserId,
          action:
            nextStatus === ReportStatus.IN_REVIEW
              ? 'REPORT_REVIEW_STARTED'
              : nextStatus === ReportStatus.RESOLVED
                ? 'REPORT_RESOLVED'
                : 'REPORT_DISMISSED',
          subjectType: 'REPORT',
          subjectId: report.id,
          metadata: {
            previousStatus,
            status: nextStatus,
            reportedSubjectType: report.subjectType,
            reportedSubjectId: report.subjectId,
            ...(resolutionNote ? { resolutionNote } : {}),
          },
        }),
      );
    });
  }

  private async presentForAdmin(reports: AbuseReport[]) {
    const idsByType = {
      [ReportSubjectType.COMPANY]: reports
        .filter((report) => report.subjectType === ReportSubjectType.COMPANY)
        .map((report) => report.subjectId),
      [ReportSubjectType.JOB]: reports
        .filter((report) => report.subjectType === ReportSubjectType.JOB)
        .map((report) => report.subjectId),
      [ReportSubjectType.USER]: reports
        .filter((report) => report.subjectType === ReportSubjectType.USER)
        .map((report) => report.subjectId),
    };
    const [companies, jobs, users] = await Promise.all([
      idsByType.COMPANY.length
        ? this.companies.find({ where: { id: In(idsByType.COMPANY) } })
        : [],
      idsByType.JOB.length
        ? this.jobs.find({
            where: { id: In(idsByType.JOB) },
            relations: { companyProfile: true },
          })
        : [],
      idsByType.USER.length
        ? this.users.find({ where: { id: In(idsByType.USER) } })
        : [],
    ]);
    const subjects = new Map<string, Record<string, unknown>>();
    for (const company of companies) {
      subjects.set(`${ReportSubjectType.COMPANY}:${company.id}`, {
        type: ReportSubjectType.COMPANY,
        id: company.id,
        name: company.name,
        industry: company.industry,
        location: company.location,
        website: company.website,
        description: company.description,
        isVerified: company.isVerified,
        suspendedAt: company.suspendedAt,
      });
    }
    for (const job of jobs) {
      subjects.set(`${ReportSubjectType.JOB}:${job.id}`, {
        type: ReportSubjectType.JOB,
        id: job.id,
        title: job.title,
        company: job.companyProfile?.name ?? job.company,
        location: job.location,
        status: job.status,
        moderationStatus: job.moderationStatus,
        description: job.description,
        createdAt: job.createdAt,
        deadline: job.deadline,
      });
    }
    for (const user of users) {
      subjects.set(`${ReportSubjectType.USER}:${user.id}`, {
        type: ReportSubjectType.USER,
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        suspendedAt: user.suspendedAt,
        createdAt: user.createdAt,
      });
    }
    return reports.map((report) => ({
      id: report.id,
      reporter: report.reporter
        ? {
            id: report.reporter.id,
            email: report.reporter.email,
            role: report.reporter.role,
          }
        : null,
      subjectType: report.subjectType,
      subjectId: report.subjectId,
      subject:
        subjects.get(`${report.subjectType}:${report.subjectId}`) ?? null,
      category: report.category,
      description: report.description,
      status: report.status,
      reviewedBy: report.reviewedBy
        ? { id: report.reviewedBy.id, email: report.reviewedBy.email }
        : null,
      reviewedAt: report.reviewedAt,
      resolutionNote: report.resolutionNote,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    }));
  }
}
