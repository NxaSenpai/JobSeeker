import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, MoreThan, Repository } from 'typeorm';
import { Company } from '../account/entities/company.entity';
import { Job } from '../account/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { CreateReportDto, UserReportsQueryDto } from './report.dto';
import {
  AbuseReport,
  ReportStatus,
  ReportSubjectType,
} from './entities/abuse-report.entity';

const MAX_REPORTS_PER_HOUR = 5;
const REPORT_WINDOW_MS = 60 * 60 * 1000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ReportService {
  constructor(
    private readonly database: DataSource,
    @InjectRepository(AbuseReport)
    private readonly reports: Repository<AbuseReport>,
  ) {}

  async submit(reporter: User, dto: CreateReportDto) {
    const subjectId = dto.subjectId.trim();
    if (
      dto.subjectType !== ReportSubjectType.JOB &&
      !UUID_PATTERN.test(subjectId)
    ) {
      throw new NotFoundException('The reported item was not found.');
    }
    if (
      dto.subjectType === ReportSubjectType.USER &&
      subjectId.toLowerCase() === reporter.id.toLowerCase()
    ) {
      throw new ConflictException('You cannot report your own account.');
    }

    try {
      const report = await this.database.transaction(async (manager) => {
        const currentReporter = await manager.findOne(User, {
          where: { id: reporter.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!currentReporter)
          throw new NotFoundException('Your account was not found.');

        const reportsInWindow = await manager.count(AbuseReport, {
          where: {
            reporterUserId: reporter.id,
            createdAt: MoreThan(new Date(Date.now() - REPORT_WINDOW_MS)),
          },
        });
        if (reportsInWindow >= MAX_REPORTS_PER_HOUR) {
          throw new HttpException(
            'You have reached the report limit. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const normalizedSubjectId =
          dto.subjectType === ReportSubjectType.JOB
            ? subjectId
            : subjectId.toLowerCase();
        await this.ensureSubjectExists(
          manager,
          dto.subjectType,
          normalizedSubjectId,
        );

        const entity = manager.create(AbuseReport, {
          reporterUserId: reporter.id,
          subjectType: dto.subjectType,
          subjectId: normalizedSubjectId,
          category: dto.category,
          description: dto.description.trim(),
          status: ReportStatus.OPEN,
          reviewedByUserId: null,
          reviewedAt: null,
          resolutionNote: null,
        });
        return manager.save(entity);
      });
      return { report: this.presentForReporter(report) };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'You already have an active report for this item.',
        );
      }
      throw error;
    }
  }

  async listMine(reporter: User, query: UserReportsQueryDto) {
    const builder = this.reports
      .createQueryBuilder('report')
      .where('report.reporterUserId = :reporterUserId', {
        reporterUserId: reporter.id,
      });
    if (query.status)
      builder.andWhere('report.status = :status', { status: query.status });
    const [reports, total] = await builder
      .orderBy('report.createdAt', 'DESC')
      .addOrderBy('report.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      reports: reports.map((report) => this.presentForReporter(report)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  private async ensureSubjectExists(
    manager: EntityManager,
    subjectType: ReportSubjectType,
    subjectId: string,
  ) {
    let exists = false;
    if (subjectType === ReportSubjectType.JOB) {
      exists = Boolean(
        await manager.findOne(Job, {
          where: { id: subjectId, isDemo: false },
          select: { id: true },
        }),
      );
    } else if (subjectType === ReportSubjectType.COMPANY) {
      exists = Boolean(
        await manager.findOne(Company, {
          where: { id: subjectId, isDemo: false },
          select: { id: true },
        }),
      );
    } else {
      exists = Boolean(
        await manager.findOne(User, {
          where: { id: subjectId },
          select: { id: true },
        }),
      );
    }
    if (!exists)
      throw new NotFoundException('The reported item was not found.');
  }

  private presentForReporter(report: AbuseReport) {
    return {
      id: report.id,
      subjectType: report.subjectType,
      subjectId: report.subjectId,
      category: report.category,
      description: report.description,
      status: report.status,
      reviewedAt: report.reviewedAt,
      resolutionNote: report.resolutionNote,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }
}
