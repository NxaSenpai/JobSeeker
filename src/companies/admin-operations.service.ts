import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Company } from '../account/entities/company.entity';
import {
  Job,
  JobModerationStatus,
  JobStatus,
} from '../account/entities/job.entity';
import { presentJob } from '../account/job-presenter';
import { User } from '../users/entities/user.entity';
import { AuditLog } from './audit-log.entity';
import {
  AdminCompaniesQueryDto,
  AdminCompanyStatus,
  AdminJobsQueryDto,
  AdminListQueryDto,
  AdminReasonDto,
  AdminUsersQueryDto,
} from './admin.dto';
import { CompanyService } from './company.service';

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly database: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
    private readonly companyService: CompanyService,
  ) {}

  async listUsers(query: AdminUsersQueryDto) {
    const builder = this.users.createQueryBuilder('user');
    if (query.search?.trim()) {
      builder.andWhere(
        `(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.companyName ILIKE :search)`,
        { search: `%${query.search.trim()}%` },
      );
    }
    if (query.role) builder.andWhere('user.role = :role', { role: query.role });
    if (query.suspended !== undefined) {
      builder.andWhere(
        query.suspended
          ? 'user.suspendedAt IS NOT NULL'
          : 'user.suspendedAt IS NULL',
      );
    }
    const [users, total] = await builder
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      users: users.map((user) => this.presentUser(user)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getUser(id: string) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('User was not found.');
    return { user: this.presentUser(user) };
  }

  async suspendUser(id: string, actorUserId: string, dto: AdminReasonDto) {
    if (id === actorUserId)
      throw new ConflictException('Admins cannot suspend their own account.');
    return this.database.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('User was not found.');
      if (!user.suspendedAt) {
        user.suspendedAt = new Date();
        user.suspensionReason = dto.reason;
        user.sessionVersion = (user.sessionVersion ?? 0) + 1;
        await manager.save(user);
        await this.writeAudit(
          manager,
          actorUserId,
          'USER_SUSPENDED',
          'USER',
          id,
          {
            reason: dto.reason,
          },
        );
      }
      return { user: this.presentUser(user) };
    });
  }

  async unsuspendUser(id: string, actorUserId: string) {
    return this.database.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('User was not found.');
      if (user.suspendedAt) {
        user.suspendedAt = null;
        user.suspensionReason = null;
        await manager.save(user);
        await this.writeAudit(
          manager,
          actorUserId,
          'USER_UNSUSPENDED',
          'USER',
          id,
        );
      }
      return { user: this.presentUser(user) };
    });
  }

  async listCompanies(query: AdminCompaniesQueryDto) {
    const builder = this.companies
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.owner', 'owner')
      .where('company.isDemo = false');
    if (query.search?.trim()) {
      builder.andWhere(
        '(company.name ILIKE :search OR company.industry ILIKE :search OR company.location ILIKE :search OR owner.email ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }
    if (query.status === AdminCompanyStatus.PENDING)
      builder.andWhere(
        'company.isVerified = false AND company.suspendedAt IS NULL',
      );
    if (query.status === AdminCompanyStatus.VERIFIED)
      builder.andWhere(
        'company.isVerified = true AND company.suspendedAt IS NULL',
      );
    if (query.status === AdminCompanyStatus.SUSPENDED)
      builder.andWhere('company.suspendedAt IS NOT NULL');
    const [companies, total] = await builder
      .orderBy('company.createdAt', 'DESC')
      .addOrderBy('company.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      companies: companies.map((company) => ({
        company: this.presentAdminCompany(company),
        ownerContact: company.owner
          ? {
              email: company.owner.email,
              contactName: company.owner.contactName,
              emailVerified: company.owner.emailVerified,
              suspendedAt: company.owner.suspendedAt,
            }
          : null,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async approveCompany(id: string, actorUserId: string) {
    return this.setCompanyVerification(id, true, actorUserId);
  }

  async unverifyCompany(id: string, actorUserId: string) {
    return this.setCompanyVerification(
      id,
      false,
      actorUserId,
      undefined,
      'COMPANY_UNVERIFIED',
    );
  }

  async rejectCompany(id: string, actorUserId: string, dto: AdminReasonDto) {
    return this.setCompanyVerification(id, false, actorUserId, dto.reason);
  }

  async suspendCompany(id: string, actorUserId: string, dto: AdminReasonDto) {
    return this.database.transaction(async (manager) => {
      const company = await manager.findOne(Company, {
        where: { id, isDemo: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!company) throw new NotFoundException('Company was not found.');
      if (!company.suspendedAt) {
        company.suspendedAt = new Date();
        company.suspensionReason = dto.reason;
        await manager.save(company);
        if (company.ownerUserId) {
          await manager.increment(
            User,
            { id: company.ownerUserId },
            'sessionVersion',
            1,
          );
        }
        await this.writeAudit(
          manager,
          actorUserId,
          'COMPANY_SUSPENDED',
          'COMPANY',
          id,
          {
            reason: dto.reason,
          },
        );
      }
      return { company: this.presentAdminCompany(company) };
    });
  }

  async unsuspendCompany(id: string, actorUserId: string) {
    return this.database.transaction(async (manager) => {
      const company = await manager.findOne(Company, {
        where: { id, isDemo: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!company) throw new NotFoundException('Company was not found.');
      if (company.suspendedAt) {
        company.suspendedAt = null;
        company.suspensionReason = null;
        await manager.save(company);
        await this.writeAudit(
          manager,
          actorUserId,
          'COMPANY_UNSUSPENDED',
          'COMPANY',
          id,
        );
      }
      return { company: this.presentAdminCompany(company) };
    });
  }

  async listJobs(query: AdminJobsQueryDto) {
    const builder = this.jobs
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.companyProfile', 'company');
    builder.andWhere('job.moderationStatus = :moderationStatus', {
      moderationStatus: query.moderationStatus ?? JobModerationStatus.PENDING,
    });
    builder.andWhere('job.status = :status', {
      status: query.status ?? JobStatus.PUBLISHED,
    });
    if (query.search?.trim()) {
      builder.andWhere(
        '(job.title ILIKE :search OR job.company ILIKE :search OR company.name ILIKE :search OR job.location ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }
    const [jobs, total] = await builder
      .orderBy('job.updatedAt', 'DESC')
      .addOrderBy('job.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      jobs: jobs.map((job) => presentJob(job)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async approveJob(id: string, actorUserId: string) {
    return this.changeJobModeration(
      id,
      actorUserId,
      JobModerationStatus.APPROVED,
    );
  }

  async rejectJob(id: string, actorUserId: string, dto: AdminReasonDto) {
    return this.changeJobModeration(
      id,
      actorUserId,
      JobModerationStatus.REJECTED,
      dto.reason,
    );
  }

  async hideJob(id: string, actorUserId: string, dto: AdminReasonDto) {
    return this.changeJobModeration(
      id,
      actorUserId,
      JobModerationStatus.HIDDEN,
      dto.reason,
    );
  }

  async listAuditLogs(query: AdminListQueryDto) {
    const builder = this.auditLogs
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor');
    if (query.search?.trim()) {
      builder.andWhere(
        '(audit.action ILIKE :search OR audit.subjectType ILIKE :search OR audit.subjectId ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }
    const [logs, total] = await builder
      .orderBy('audit.createdAt', 'DESC')
      .addOrderBy('audit.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      auditLogs: logs.map((log) => ({
        id: log.id,
        actor: { id: log.actorUserId, email: log.actor.email },
        action: log.action,
        subjectType: log.subjectType,
        subjectId: log.subjectId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  private async setCompanyVerification(
    id: string,
    isVerified: boolean,
    actorUserId: string,
    reason?: string,
    actionOverride?: string,
  ) {
    return this.database.transaction(async (manager) => {
      const company = await manager.findOne(Company, {
        where: { id, isDemo: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!company) throw new NotFoundException('Company was not found.');
      if (isVerified && company.ownerUserId) {
        const owner = await manager.findOne(User, {
          where: { id: company.ownerUserId },
          lock: { mode: 'pessimistic_read' },
        });
        if (!owner?.emailVerified || owner.suspendedAt)
          throw new ConflictException(
            'The company owner must have a verified, active account before approval.',
          );
      }
      const wasVerified = company.isVerified;
      const previousNote = company.moderationNote;
      company.isVerified = isVerified;
      company.moderationNote = isVerified ? null : (reason ?? null);
      await manager.save(company);
      if (
        wasVerified !== isVerified ||
        previousNote !== company.moderationNote
      ) {
        await this.writeAudit(
          manager,
          actorUserId,
          actionOverride ??
            (isVerified
              ? 'COMPANY_APPROVED'
              : reason
                ? 'COMPANY_REJECTED'
                : 'COMPANY_UNVERIFIED'),
          'COMPANY',
          id,
          {
            wasVerified,
            isVerified,
            ...(previousNote ? { previousNote } : {}),
            ...(reason ? { reason } : {}),
          },
        );
      }
      return { company: this.presentAdminCompany(company) };
    });
  }

  private async changeJobModeration(
    id: string,
    actorUserId: string,
    moderationStatus: JobModerationStatus,
    reason?: string,
  ) {
    return this.database.transaction(async (manager) => {
      const job = await manager.findOne(Job, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!job) throw new NotFoundException('Job was not found.');
      const previousStatus = job.moderationStatus;
      const previousNote = job.moderationNote;
      job.moderationStatus = moderationStatus;
      job.moderationNote = reason ?? null;
      await manager.save(job);
      if (
        previousStatus !== moderationStatus ||
        previousNote !== job.moderationNote
      ) {
        await this.writeAudit(
          manager,
          actorUserId,
          `JOB_${moderationStatus}`,
          'JOB',
          id,
          {
            previousStatus,
            moderationStatus,
            ...(reason ? { reason } : {}),
          },
        );
      }
      return { job: presentJob(job) };
    });
  }

  private async writeAudit(
    manager: EntityManager,
    actorUserId: string,
    action: string,
    subjectType: string,
    subjectId: string,
    metadata: Record<string, unknown> = {},
  ) {
    const repository = manager.getRepository(AuditLog);
    await repository.save(
      repository.create({
        actorUserId,
        action,
        subjectType,
        subjectId,
        metadata,
      }),
    );
  }

  private presentUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      companyName: user.companyName,
      contactName: user.contactName,
      emailVerified: user.emailVerified,
      suspendedAt: user.suspendedAt,
      suspensionReason: user.suspensionReason,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private presentAdminCompany(company: Company) {
    return {
      ...this.companyService.present(company),
      suspendedAt: company.suspendedAt,
      suspensionReason: company.suspensionReason,
      moderationNote: company.moderationNote,
    };
  }
}
