import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Job,
  JobModerationStatus,
  JobStatus,
} from '../account/entities/job.entity';
import { presentJob } from '../account/job-presenter';
import { User } from '../users/entities/user.entity';
import { CompanyService } from './company.service';
import { CompanyJobsQueryDto, JobWriteDto } from './company.dto';

function jobIdFromTitle(title: string) {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 55);
  return `${slug || 'job'}-${randomUUID()}`;
}

const writableFields = [
  'title',
  'team',
  'location',
  'country',
  'city',
  'address',
  'category',
  'industry',
  'jobType',
  'workplaceType',
  'summary',
  'description',
  'responsibilities',
  'requirements',
  'benefits',
  'salaryMin',
  'salaryMax',
  'currency',
  'salaryPeriod',
  'experienceLevel',
  'minExperienceYears',
  'educationLevel',
  'vacancies',
] as const;

@Injectable()
export class CompanyJobsService {
  constructor(
    private readonly database: DataSource,
    private readonly companiesService: CompanyService,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
  ) {}

  async list(user: User, query: CompanyJobsQueryDto) {
    const company = await this.companiesService.ensureOwnProfile(user);
    const builder = this.jobs
      .createQueryBuilder('job')
      .where('job.companyId = :companyId', { companyId: company.id });
    if (query.status)
      builder.andWhere('job.status = :status', { status: query.status });
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      builder.andWhere(
        '(job.title ILIKE :search OR job.team ILIKE :search OR job.location ILIKE :search)',
        { search },
      );
    }
    const [jobs, total] = await builder
      .orderBy('job.updatedAt', 'DESC')
      .addOrderBy('job.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      jobs: jobs.map(presentJob),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async get(user: User, id: string) {
    const company = await this.companiesService.ensureOwnProfile(user);
    const job = await this.jobs.findOne({
      where: { id, companyId: company.id },
      relations: { companyProfile: true },
    });
    if (!job) throw new NotFoundException('Job was not found.');
    return { job: presentJob(job) };
  }

  async create(user: User, dto: JobWriteDto) {
    const company = await this.companiesService.ensureOwnProfile(user);
    if (!dto.title?.trim() || !dto.location?.trim()) {
      throw new BadRequestException('Job title and location are required.');
    }
    this.validateSalary(dto.salaryMin, dto.salaryMax);
    const input: Partial<Job> = {
      id: jobIdFromTitle(dto.title),
      companyId: company.id,
      company: company.name,
      status: JobStatus.DRAFT,
      moderationStatus: JobModerationStatus.PENDING,
      moderationNote: null,
      isDemo: false,
      isFeatured: false,
      publishedAt: null,
      jobType: 'FULL_TIME' as Job['jobType'],
      workplaceType: 'ONSITE' as Job['workplaceType'],
      salaryPeriod: 'YEAR' as Job['salaryPeriod'],
      currency: 'USD',
      responsibilities: [],
      requirements: [],
      benefits: [],
      skills: [],
      vacancies: 1,
    };
    this.copyWritableFields(input, dto);
    input.deadline = dto.deadline ? new Date(dto.deadline) : null;
    const saved = await this.jobs.save(this.jobs.create(input));
    return { job: presentJob({ ...saved, companyProfile: company }) };
  }

  async update(user: User, id: string, dto: JobWriteDto) {
    const company = await this.companiesService.ensureOwnProfile(user);
    this.validateSalary(dto.salaryMin, dto.salaryMax);
    const saved = await this.database.transaction(async (manager) => {
      const job = await manager.findOne(Job, {
        where: { id, companyId: company.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!job) throw new NotFoundException('Job was not found.');
      this.copyWritableFields(job, dto);
      if (dto.deadline !== undefined)
        job.deadline = dto.deadline ? new Date(dto.deadline) : null;
      this.validateSalary(job.salaryMin, job.salaryMax);
      job.moderationStatus = JobModerationStatus.PENDING;
      job.moderationNote = null;
      return manager.save(job);
    });
    return { job: presentJob({ ...saved, companyProfile: company }) };
  }

  async publish(user: User, id: string) {
    const company = await this.companiesService.ensureOwnProfile(user);
    if (!company.isVerified || company.suspendedAt) {
      throw new ConflictException(
        'Your company profile must be approved before you can publish jobs.',
      );
    }
    return this.transition(user, id, (job) => {
      if (job.status === JobStatus.ARCHIVED) {
        throw new ConflictException('Archived jobs cannot be published.');
      }
      if (
        !job.title.trim() ||
        !job.location.trim() ||
        !job.description.trim()
      ) {
        throw new BadRequestException(
          'Add a job title, location, and description before publishing.',
        );
      }
      if (job.deadline && job.deadline.getTime() <= Date.now()) {
        throw new BadRequestException('The application deadline has passed.');
      }
      job.status = JobStatus.PUBLISHED;
      job.publishedAt = new Date();
    });
  }

  async unpublish(user: User, id: string) {
    return this.transition(user, id, (job) => {
      if (job.status !== JobStatus.PUBLISHED) {
        throw new ConflictException('Only a published job can be unpublished.');
      }
      job.status = JobStatus.DRAFT;
    });
  }

  async close(user: User, id: string) {
    return this.transition(user, id, (job) => {
      if (job.status === JobStatus.ARCHIVED) {
        throw new ConflictException('Archived jobs cannot be closed.');
      }
      job.status = JobStatus.CLOSED;
    });
  }

  async archive(user: User, id: string) {
    return this.transition(user, id, (job) => {
      job.status = JobStatus.ARCHIVED;
    });
  }

  private async transition(
    user: User,
    id: string,
    change: (job: Job) => void | Promise<void>,
  ) {
    const company = await this.companiesService.ensureOwnProfile(user);
    const saved = await this.database.transaction(async (manager) => {
      const job = await manager.findOne(Job, {
        where: { id, companyId: company.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!job) throw new NotFoundException('Job was not found.');
      await change(job);
      return manager.save(job);
    });
    return { job: presentJob({ ...saved, companyProfile: company }) };
  }

  private copyWritableFields(target: Partial<Job>, dto: JobWriteDto) {
    for (const field of writableFields) {
      if (dto[field] === undefined) continue;
      const value = dto[field];
      if (field === 'salaryMin' || field === 'salaryMax') {
        (target as Record<string, unknown>)[field] =
          value === null
            ? null
            : value === undefined
              ? undefined
              : String(value);
      } else {
        (target as Record<string, unknown>)[field] = value;
      }
    }
  }

  private validateSalary(
    minimum: number | string | null | undefined,
    maximum: number | string | null | undefined,
  ) {
    if (
      minimum !== undefined &&
      minimum !== null &&
      maximum !== undefined &&
      maximum !== null &&
      Number(minimum) > Number(maximum)
    ) {
      throw new BadRequestException(
        'Maximum salary must be greater than or equal to minimum salary.',
      );
    }
  }
}
