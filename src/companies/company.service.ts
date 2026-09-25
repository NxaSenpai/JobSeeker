import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Job, JobStatus } from '../account/entities/job.entity';
import { Company } from '../account/entities/company.entity';
import { CompaniesQueryDto, UpdateCompanyProfileDto } from './company.dto';

function slugPart(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function cleanSocialLinks(value: Record<string, string>) {
  const allowed = new Set([
    'linkedin',
    'facebook',
    'instagram',
    'x',
    'youtube',
  ]);
  const clean: Record<string, string> = {};
  for (const [platform, rawUrl] of Object.entries(value)) {
    if (!allowed.has(platform)) {
      throw new BadRequestException(`Unsupported social link: ${platform}.`);
    }
    if (typeof rawUrl !== 'string' || rawUrl.length > 2048) {
      throw new BadRequestException('Social links must be valid HTTPS URLs.');
    }
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Social links must be valid HTTPS URLs.');
    }
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new BadRequestException('Social links must use HTTPS.');
    }
    clean[platform] = url.toString();
  }
  return clean;
}

@Injectable()
export class CompanyService {
  constructor(
    private readonly database: DataSource,
    @InjectRepository(Company)
    private readonly companies: Repository<Company>,
    @InjectRepository(Job)
    private readonly jobs: Repository<Job>,
  ) {}

  async ensureOwnProfile(user: User) {
    if (user.role !== UserRole.COMPANY) {
      throw new ConflictException('A company account is required.');
    }
    const current = await this.companies.findOneBy({ ownerUserId: user.id });
    if (current) return current;

    const id = randomUUID();
    const name = user.companyName?.trim() || 'Company';
    try {
      return await this.companies.save(
        this.companies.create({
          id,
          ownerUserId: user.id,
          name,
          slug: `${slugPart(name) || 'company'}-${id.slice(0, 12)}`,
          isVerified: false,
          isDemo: false,
          socialLinks: {},
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error;
      const createdByConcurrentRequest = await this.companies.findOneBy({
        ownerUserId: user.id,
      });
      if (createdByConcurrentRequest) return createdByConcurrentRequest;
      throw error;
    }
  }

  async ownProfile(user: User) {
    return { company: this.present(await this.ensureOwnProfile(user)) };
  }

  async updateOwnProfile(user: User, dto: UpdateCompanyProfileDto) {
    const current = await this.ensureOwnProfile(user);
    const updated = await this.database.transaction(async (manager) => {
      const company = await manager.findOne(Company, {
        where: { id: current.id, ownerUserId: user.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!company)
        throw new NotFoundException('Company profile was not found.');
      if (dto.name !== undefined) company.name = dto.name;
      if (dto.industry !== undefined) company.industry = dto.industry || null;
      if (dto.companySize !== undefined)
        company.companySize = dto.companySize || null;
      if (dto.foundedYear !== undefined) company.foundedYear = dto.foundedYear;
      if (dto.location !== undefined) company.location = dto.location || null;
      if (dto.website !== undefined)
        company.website = dto.website?.trim() || null;
      if (dto.description !== undefined)
        company.description = dto.description.trim() || null;
      if (dto.contactEmail !== undefined)
        company.contactEmail = dto.contactEmail?.trim().toLowerCase() || null;
      if (dto.timezone !== undefined) company.timezone = dto.timezone || null;
      if (dto.socialLinks !== undefined)
        company.socialLinks = cleanSocialLinks(dto.socialLinks);
      if (dto.logoUrl !== undefined) company.logoUrl = dto.logoUrl || null;
      if (dto.bannerUrl !== undefined)
        company.bannerUrl = dto.bannerUrl || null;
      if (dto.name !== undefined) {
        await manager.update(User, { id: user.id }, { companyName: dto.name });
      }
      return manager.save(company);
    });
    return { company: this.present(updated) };
  }

  async listPublic(query: CompaniesQueryDto) {
    const builder = this.companies
      .createQueryBuilder('company')
      .where('(company.isVerified = true OR company.isDemo = true)')
      .andWhere('(company.isDemo = true OR company.suspendedAt IS NULL)');
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      builder.andWhere(
        '(company.name ILIKE :search OR company.industry ILIKE :search OR company.location ILIKE :search)',
        { search },
      );
    }
    if (query.industry?.trim()) {
      builder.andWhere('company.industry ILIKE :industry', {
        industry: query.industry.trim(),
      });
    }
    if (query.location?.trim()) {
      builder.andWhere('company.location ILIKE :location', {
        location: `%${query.location.trim()}%`,
      });
    }

    const [companies, total] = await builder
      .orderBy('company.name', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    const openJobs = await this.openJobCounts(companies.map(({ id }) => id));

    return {
      companies: companies.map((company) =>
        this.present(company, openJobs.get(company.id) ?? 0),
      ),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async publicProfile(identifier: string) {
    const company = await this.findPublic(identifier);
    const openJobs = await this.openJobCounts([company.id]);
    return {
      company: this.present(company, openJobs.get(company.id) ?? 0),
    };
  }

  async findPublic(identifier: string) {
    const builder = this.companies.createQueryBuilder('company');
    if (isUuid(identifier)) {
      builder.where('(company.slug = :slug OR company.id = :id)', {
        slug: identifier,
        id: identifier,
      });
    } else {
      builder.where('company.slug = :slug', { slug: identifier });
    }
    builder
      .andWhere('(company.isVerified = true OR company.isDemo = true)')
      .andWhere('(company.isDemo = true OR company.suspendedAt IS NULL)');
    const company = await builder.getOne();
    if (!company) throw new NotFoundException('Company was not found.');
    return company;
  }

  async pendingForAdmin() {
    const companies = await this.companies.find({
      where: { isVerified: false, isDemo: false },
      relations: { owner: true },
      order: { createdAt: 'ASC' },
    });
    return {
      companies: companies.map((company) => ({
        company: this.present(company),
        ownerContact: company.owner
          ? {
              email: company.owner.email,
              contactName: company.owner.contactName,
              emailVerified: company.owner.emailVerified,
            }
          : null,
      })),
    };
  }

  present(company: Company, openJobs?: number) {
    return {
      id: company.id,
      slug: company.slug,
      name: company.name,
      industry: company.industry,
      companySize: company.companySize,
      foundedYear: company.foundedYear,
      location: company.location,
      website: company.website,
      description: company.description,
      contactEmail: company.contactEmail,
      timezone: company.timezone,
      socialLinks: company.socialLinks ?? {},
      logoUrl: company.logoUrl,
      bannerUrl: company.bannerUrl,
      isVerified: company.isVerified,
      moderationNote: company.isVerified ? null : company.moderationNote,
      ...(openJobs === undefined ? {} : { openJobs }),
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  private async openJobCounts(companyIds: string[]) {
    if (!companyIds.length) return new Map<string, number>();
    const rows = await this.jobs
      .createQueryBuilder('job')
      .select('job.companyId', 'companyId')
      .addSelect('COUNT(*)', 'count')
      .where('job.companyId IN (:...companyIds)', { companyIds })
      .andWhere('job.status = :status', { status: JobStatus.PUBLISHED })
      .andWhere('job.moderationStatus = :moderationStatus', {
        moderationStatus: 'APPROVED',
      })
      .andWhere('(job.deadline IS NULL OR job.deadline > NOW())')
      .groupBy('job.companyId')
      .getRawMany<{ companyId: string; count: string }>();
    return new Map(rows.map((row) => [row.companyId, Number(row.count)]));
  }
}
