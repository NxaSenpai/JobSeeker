import { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { JobService } from './job.service';

describe('JobService public categories', () => {
  it('counts only public listings and returns integer counts', async () => {
    const builder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { name: 'Design', count: '3' },
        { name: 'Software Development', count: '12' },
      ]),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    };
    const service = new JobService(
      repository as unknown as Repository<Job>,
      {} as ConfigService,
    );

    await expect(service.categories()).resolves.toEqual({
      categories: [
        { name: 'Design', count: 3 },
        { name: 'Software Development', count: 12 },
      ],
    });

    expect(builder.leftJoin).toHaveBeenCalledWith(
      'job.companyProfile',
      'company',
    );
    expect(builder.where).toHaveBeenCalledWith('job.status = :status', {
      status: 'PUBLISHED',
    });
    expect(builder.andWhere).toHaveBeenCalledWith(
      'job.moderationStatus = :moderationStatus',
      { moderationStatus: 'APPROVED' },
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      '(job.isDemo = true OR company.isVerified = true)',
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      '(job.deadline IS NULL OR job.deadline > NOW())',
    );
    expect(builder.groupBy).toHaveBeenCalledTimes(1);
  });
});
