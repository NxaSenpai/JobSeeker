import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Job,
  JobModerationStatus,
  JobStatus,
  JobType,
  SalaryPeriod,
  WorkplaceType,
} from './entities/job.entity';
import { presentJob } from './job-presenter';
import { PublicJobsQueryDto } from '../companies/company.dto';

const samples: Array<
  Partial<Job> & Pick<Job, 'id' | 'title' | 'company' | 'location'>
> = [
  {
    id: 'product-designer',
    title: 'Senior Product Designer',
    company: 'Figma',
    location: 'London, United Kingdom',
    category: 'Design',
    industry: 'Design software',
    jobType: JobType.FULL_TIME,
    workplaceType: WorkplaceType.HYBRID,
    summary:
      'Shape intuitive tools that help teams turn ambitious ideas into products people love.',
    description:
      'Join a collaborative product team and take thoughtful, high-impact workflows from early discovery through polished releases.',
    responsibilities: [
      'Lead design from discovery through delivery.',
      'Turn research and product data into clear design decisions.',
      'Partner with engineers on accessible, polished experiences.',
    ],
    requirements: [
      'Five or more years of product design experience.',
      'A portfolio showing your design thinking.',
      'Strong communication and collaboration skills.',
    ],
    skills: ['Product design', 'Figma', 'Design systems'],
    salaryMin: '85000',
    salaryMax: '110000',
    currency: 'USD',
    salaryPeriod: SalaryPeriod.YEAR,
    isFeatured: true,
  },
  {
    id: 'growth-marketer',
    title: 'Growth Marketing Manager',
    company: 'Spotify',
    location: 'Remote — Europe',
    category: 'Marketing',
    industry: 'Music & audio',
    jobType: JobType.FULL_TIME,
    workplaceType: WorkplaceType.REMOTE,
    summary:
      'Build campaigns that connect creators and listeners with the next thing they will love.',
    description:
      'Own experiments across acquisition and retention, balancing sharp analysis with original creative thinking.',
    responsibilities: [
      'Develop and evaluate multi-channel growth experiments.',
      'Translate insights into audience-first messaging.',
      'Partner with product and creative teams.',
    ],
    requirements: [
      'Four or more years in growth or lifecycle marketing.',
      'Experience with marketing analytics.',
      'Clear written communication.',
    ],
    skills: ['Growth strategy', 'Lifecycle', 'Analytics'],
    salaryMin: '70000',
    salaryMax: '92000',
    currency: 'USD',
    salaryPeriod: SalaryPeriod.YEAR,
    isFeatured: true,
  },
  {
    id: 'full-stack-engineer',
    title: 'Full-Stack Engineer',
    company: 'Slack',
    location: 'Dublin, Ireland',
    category: 'Software Development',
    industry: 'Workplace software',
    jobType: JobType.FULL_TIME,
    workplaceType: WorkplaceType.HYBRID,
    summary:
      'Create reliable, elegant collaboration experiences used by teams around the world.',
    description:
      'Build across the product stack and help make everyday collaboration more focused and dependable.',
    responsibilities: [
      'Build and maintain product features.',
      'Improve performance and observability.',
      'Join design and technical reviews.',
    ],
    requirements: [
      'Three or more years of software development experience.',
      'Fluency in modern JavaScript or TypeScript.',
      'Care for code quality and product details.',
    ],
    skills: ['TypeScript', 'Node.js', 'React'],
    salaryMin: '78000',
    salaryMax: '105000',
    currency: 'USD',
    salaryPeriod: SalaryPeriod.YEAR,
    isFeatured: true,
  },
  {
    id: 'content-strategist',
    title: 'Content Strategist',
    company: 'WordPress',
    location: 'Remote — Global',
    category: 'Marketing',
    industry: 'Publishing technology',
    jobType: JobType.CONTRACT,
    workplaceType: WorkplaceType.REMOTE,
    summary:
      'Make complex product stories clear, useful, and enjoyable to read.',
    description:
      'Define content that guides people through their work with confidence and clarity.',
    responsibilities: [
      'Create product narratives and content plans.',
      'Edit for clarity and consistency.',
      'Measure content performance.',
    ],
    requirements: [
      'A portfolio of strategic content work.',
      'Excellent editorial judgement.',
      'Comfort working across teams.',
    ],
    skills: ['Content strategy', 'SEO', 'Editorial'],
    salaryMin: '55000',
    salaryMax: '70000',
    currency: 'USD',
    salaryPeriod: SalaryPeriod.YEAR,
    isFeatured: true,
  },
  {
    id: 'data-analyst',
    title: 'Product Data Analyst',
    company: 'App Store',
    location: 'Singapore',
    category: 'Analyst',
    industry: 'Consumer internet',
    jobType: JobType.FULL_TIME,
    workplaceType: WorkplaceType.ONSITE,
    summary:
      'Turn meaningful product signals into decisions that improve customer experiences.',
    description:
      'Investigate product questions, define useful metrics, and make analysis accessible to decision-makers.',
    responsibilities: [
      'Build reliable reporting.',
      'Design and assess product experiments.',
      'Present concise recommendations.',
    ],
    requirements: [
      'Strong SQL skills.',
      'Experience with product metrics.',
      'Ability to tell clear stories with data.',
    ],
    skills: ['SQL', 'Experimentation', 'Tableau'],
    salaryMin: '60000',
    salaryMax: '82000',
    currency: 'USD',
    salaryPeriod: SalaryPeriod.YEAR,
  },
  {
    id: 'community-manager',
    title: 'Community Manager',
    company: 'Telegram',
    location: 'Phnom Penh, Cambodia',
    category: 'Marketing',
    industry: 'Communications',
    jobType: JobType.FULL_TIME,
    workplaceType: WorkplaceType.HYBRID,
    summary: 'Grow a welcoming community around products people use every day.',
    description:
      'Connect the community and product teams, surface insights, and help people feel heard.',
    responsibilities: [
      'Plan community programs and events.',
      'Turn feedback into product insights.',
      'Build strong community relationships.',
    ],
    requirements: [
      'Experience supporting an online community.',
      'Strong writing and judgement.',
      'Comfort moving between strategy and delivery.',
    ],
    skills: ['Community', 'Social media', 'Events'],
    salaryMin: '28000',
    salaryMax: '40000',
    currency: 'USD',
    salaryPeriod: SalaryPeriod.YEAR,
  },
  {
    id: 'brand-designer',
    title: 'Brand Designer',
    company: 'Pinterest',
    location: 'San Francisco, United States',
    category: 'Design',
    industry: 'Consumer internet',
    jobType: JobType.FULL_TIME,
    workplaceType: WorkplaceType.HYBRID,
    summary:
      'Build a distinctive, flexible visual voice across campaigns and product moments.',
    description:
      'Evolve a widely loved brand through campaign concepts, social moments, and thoughtful design systems.',
    responsibilities: [
      'Create campaign concepts and polished design.',
      'Evolve brand systems.',
      'Partner with writers and marketers.',
    ],
    requirements: [
      'A strong brand or campaign portfolio.',
      'Excellent typography and visual storytelling.',
      'Sound creative judgement.',
    ],
    skills: ['Brand systems', 'Art direction', 'Motion'],
    salaryMin: '90000',
    salaryMax: '120000',
    currency: 'USD',
    salaryPeriod: SalaryPeriod.YEAR,
  },
];

@Injectable()
export class JobService implements OnModuleInit {
  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    // Demo rows are only created for local development and remain marked as
    // demo so candidates are told their applications are not delivered.
    if (
      this.config.get('NODE_ENV') === 'production' ||
      this.config.get('SEED_DEMO_JOBS') === 'false'
    )
      return;

    const now = Date.now();
    const rows = samples.map((sample, index) => ({
      ...sample,
      status: JobStatus.PUBLISHED,
      moderationStatus: JobModerationStatus.APPROVED,
      isDemo: true,
      deadline: null,
      createdAt: new Date(now - (index + 1) * 24 * 60 * 60 * 1000),
      publishedAt: new Date(now - (index + 1) * 24 * 60 * 60 * 1000),
    }));
    await this.jobs
      .createQueryBuilder()
      .insert()
      .values(rows)
      .orIgnore()
      .execute();

    // Older installations already have the same stable demo IDs. Fill only
    // their previously empty content fields, preserving any user data/status.
    for (const sample of samples) {
      const existing = await this.jobs.findOneBy({
        id: sample.id,
        isDemo: true,
      });
      if (!existing || existing.description.trim()) continue;
      await this.jobs.update(
        { id: sample.id, isDemo: true, description: '' },
        {
          ...sample,
          status: existing.status,
          publishedAt: existing.publishedAt ?? existing.createdAt,
        },
      );
    }
  }

  async list(query: PublicJobsQueryDto, companyId?: string) {
    if (
      query.minSalary !== undefined &&
      query.maxSalary !== undefined &&
      query.minSalary > query.maxSalary
    ) {
      throw new BadRequestException(
        'Minimum salary must be less than or equal to maximum salary.',
      );
    }
    const builder = this.jobs
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.companyProfile', 'company')
      .where('job.status = :status', { status: JobStatus.PUBLISHED })
      .andWhere('job.moderationStatus = :moderationStatus', {
        moderationStatus: JobModerationStatus.APPROVED,
      })
      .andWhere('(job.isDemo = true OR company.isVerified = true)')
      .andWhere('(job.isDemo = true OR company.suspendedAt IS NULL)')
      .andWhere('(job.deadline IS NULL OR job.deadline > NOW())');

    if (companyId)
      builder.andWhere('job.companyId = :companyId', { companyId });
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      builder.andWhere(
        '(job.title ILIKE :search OR job.company ILIKE :search OR company.name ILIKE :search OR job.location ILIKE :search OR job.category ILIKE :search OR job.industry ILIKE :search OR job.skills::text ILIKE :search)',
        { search },
      );
    }
    if (query.location?.trim()) {
      builder.andWhere('job.location ILIKE :location', {
        location: `%${query.location.trim()}%`,
      });
    }
    if (query.category?.trim()) {
      builder.andWhere('job.category ILIKE :category', {
        category: `%${query.category.trim()}%`,
      });
    }
    if (query.industry?.trim()) {
      builder.andWhere('job.industry ILIKE :industry', {
        industry: `%${query.industry.trim()}%`,
      });
    }
    if (query.jobType)
      builder.andWhere('job.jobType = :jobType', { jobType: query.jobType });
    if (query.workplaceType)
      builder.andWhere('job.workplaceType = :workplaceType', {
        workplaceType: query.workplaceType,
      });
    if (query.experienceLevel)
      builder.andWhere('job.experienceLevel ILIKE :experienceLevel', {
        experienceLevel: query.experienceLevel.trim(),
      });
    if (query.minSalary !== undefined)
      builder.andWhere('job.salaryMax >= :minSalary', {
        minSalary: query.minSalary,
      });
    if (query.maxSalary !== undefined)
      builder.andWhere('job.salaryMin <= :maxSalary', {
        maxSalary: query.maxSalary,
      });
    if (query.datePosted) {
      const windowMilliseconds = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      }[query.datePosted];
      builder.andWhere('job.publishedAt >= :datePostedAfter', {
        datePostedAfter: new Date(Date.now() - windowMilliseconds),
      });
    }

    switch (query.sort.toLowerCase()) {
      case 'salary':
      case 'salary_desc':
        builder.orderBy('job.salaryMax', 'DESC', 'NULLS LAST');
        break;
      case 'salary_asc':
        builder.orderBy('job.salaryMin', 'ASC', 'NULLS LAST');
        break;
      default:
        builder.orderBy('job.publishedAt', 'DESC', 'NULLS LAST');
    }
    builder.addOrderBy('job.createdAt', 'DESC').addOrderBy('job.id', 'ASC');

    const [jobs, total] = await builder
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

  async featured(limit = 8) {
    const jobs = await this.jobs
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.companyProfile', 'company')
      .where('job.status = :status', { status: JobStatus.PUBLISHED })
      .andWhere('job.moderationStatus = :moderationStatus', {
        moderationStatus: JobModerationStatus.APPROVED,
      })
      .andWhere('job.isFeatured = true')
      .andWhere('(job.isDemo = true OR company.isVerified = true)')
      .andWhere('(job.isDemo = true OR company.suspendedAt IS NULL)')
      .andWhere('(job.deadline IS NULL OR job.deadline > NOW())')
      .orderBy('job.publishedAt', 'DESC', 'NULLS LAST')
      .take(Math.min(Math.max(limit, 1), 20))
      .getMany();
    return { jobs: jobs.map(presentJob) };
  }

  async categories() {
    const category = `COALESCE(NULLIF(TRIM(job.category), ''), NULLIF(TRIM(job.industry), ''), 'Other')`;
    const rows = await this.jobs
      .createQueryBuilder('job')
      .leftJoin('job.companyProfile', 'company')
      .select(`MIN(${category})`, 'name')
      .addSelect('COUNT(*)', 'count')
      .where('job.status = :status', { status: JobStatus.PUBLISHED })
      .andWhere('job.moderationStatus = :moderationStatus', {
        moderationStatus: JobModerationStatus.APPROVED,
      })
      .andWhere('(job.isDemo = true OR company.isVerified = true)')
      .andWhere('(job.isDemo = true OR company.suspendedAt IS NULL)')
      .andWhere('(job.deadline IS NULL OR job.deadline > NOW())')
      .groupBy(`LOWER(${category})`)
      .orderBy('MIN(' + category + ')', 'ASC')
      .getRawMany<{ name: string; count: string }>();

    return {
      categories: rows.map((row) => ({
        name: row.name,
        count: Number(row.count),
      })),
    };
  }

  async similar(id: string, limit = 6) {
    const base = await this.jobs.findOne({
      where: {
        id,
        status: JobStatus.PUBLISHED,
        moderationStatus: JobModerationStatus.APPROVED,
      },
      relations: { companyProfile: true },
    });
    if (
      !base ||
      (!base.isDemo &&
        (!base.companyProfile?.isVerified || base.companyProfile?.suspendedAt))
    )
      throw new NotFoundException('This job is no longer available.');
    const builder = this.jobs
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.companyProfile', 'company')
      .where('job.status = :status', { status: JobStatus.PUBLISHED })
      .andWhere('job.moderationStatus = :moderationStatus', {
        moderationStatus: JobModerationStatus.APPROVED,
      })
      .andWhere('(job.isDemo = true OR company.isVerified = true)')
      .andWhere('(job.isDemo = true OR company.suspendedAt IS NULL)')
      .andWhere('job.id <> :id', { id })
      .andWhere('(job.deadline IS NULL OR job.deadline > NOW())');
    if (base.category) {
      builder.andWhere('job.category = :category', { category: base.category });
    } else if (base.industry) {
      builder.andWhere('job.industry = :industry', { industry: base.industry });
    } else {
      builder.andWhere('job.companyId = :companyId', {
        companyId: base.companyId,
      });
    }
    const jobs = await builder
      .orderBy('job.publishedAt', 'DESC', 'NULLS LAST')
      .take(Math.min(Math.max(limit, 1), 20))
      .getMany();
    return { jobs: jobs.map(presentJob) };
  }

  async get(id: string) {
    const job = await this.jobs.findOne({
      where: { id },
      relations: { companyProfile: true },
    });
    if (
      !job ||
      job.status !== JobStatus.PUBLISHED ||
      job.moderationStatus !== JobModerationStatus.APPROVED ||
      (!job.isDemo &&
        (!job.companyProfile?.isVerified || job.companyProfile?.suspendedAt))
    ) {
      throw new NotFoundException('This job is no longer available.');
    }
    return presentJob(job);
  }
}
