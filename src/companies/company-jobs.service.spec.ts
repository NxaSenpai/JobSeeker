import { DataSource, Repository } from 'typeorm';
import { Application } from '../account/entities/application.entity';
import { Job, JobStatus } from '../account/entities/job.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CompanyJobsQueryDto } from './company.dto';
import { CompanyService } from './company.service';
import { CompanyJobsService } from './company-jobs.service';

describe('CompanyJobsService', () => {
  const company = { id: 'company-1' };
  const user = { id: 'company-user-1', role: UserRole.COMPANY } as User;
  const jobs = [
    {
      id: 'engineer-role',
      title: 'Engineer',
      companyId: company.id,
      company: 'Northstar Labs',
      companyProfile: null,
      team: 'Engineering',
      location: 'Phnom Penh',
      jobType: 'FULL_TIME',
      workplaceType: 'HYBRID',
      status: JobStatus.PUBLISHED,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      publishedAt: new Date('2026-01-02T00:00:00.000Z'),
    },
    {
      id: 'designer-role',
      title: 'Designer',
      companyId: company.id,
      company: 'Northstar Labs',
      companyProfile: null,
      team: 'Design',
      location: 'Remote',
      jobType: 'FULL_TIME',
      workplaceType: 'REMOTE',
      status: JobStatus.DRAFT,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      publishedAt: null,
    },
  ] as unknown as Job[];

  let service: CompanyJobsService;
  let jobQuery: Record<string, jest.Mock>;
  let applicationQuery: Record<string, jest.Mock>;
  let companies: { ensureOwnProfile: jest.Mock };
  let applications: { createQueryBuilder: jest.Mock };

  beforeEach(() => {
    jobQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([jobs, jobs.length]),
    };
    applicationQuery = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { jobId: 'engineer-role', applicantCount: 3 },
      ]),
    };
    companies = { ensureOwnProfile: jest.fn().mockResolvedValue(company) };
    applications = {
      createQueryBuilder: jest.fn().mockReturnValue(applicationQuery),
    };
    const jobRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(jobQuery),
    };
    service = new CompanyJobsService(
      {} as DataSource,
      companies as unknown as CompanyService,
      jobRepository as unknown as Repository<Job>,
      applications as unknown as Repository<Application>,
    );
  });

  it('returns per-job applicant totals without loading candidate records', async () => {
    const result = await service.list(user, {
      page: 1,
      limit: 20,
    } as CompanyJobsQueryDto);

    expect(result.jobs.map((job) => [job.id, job.applicantCount])).toEqual([
      ['engineer-role', 3],
      ['designer-role', 0],
    ]);
    expect(applicationQuery.where).toHaveBeenCalledWith(
      'application.jobId IN (:...jobIds)',
      { jobIds: ['engineer-role', 'designer-role'] },
    );
    expect(applicationQuery.groupBy).toHaveBeenCalledWith(
      'application.jobId',
    );
  });

  it('skips the applicant aggregation when there are no jobs on the page', async () => {
    jobQuery.getManyAndCount.mockResolvedValue([[], 0]);

    const result = await service.list(user, {
      page: 1,
      limit: 20,
    } as CompanyJobsQueryDto);

    expect(result.jobs).toEqual([]);
    expect(applications.createQueryBuilder).not.toHaveBeenCalled();
  });
});
