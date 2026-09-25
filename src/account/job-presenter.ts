import { Company } from './entities/company.entity';
import { Job } from './entities/job.entity';

export function presentCompanySummary(company: Company | null | undefined) {
  if (!company) return null;
  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    industry: company.industry,
    location: company.location,
    website: company.website,
    logoUrl: company.logoUrl,
    isVerified: company.isVerified,
  };
}

export function presentJob(job: Job) {
  const { companyProfile, ...safeJobFields } = job;
  return {
    ...safeJobFields,
    salaryMin: job.salaryMin === null ? null : Number(job.salaryMin),
    salaryMax: job.salaryMax === null ? null : Number(job.salaryMax),
    company: companyProfile?.name ?? job.company,
    companyProfile: presentCompanySummary(companyProfile),
    postedAt: job.publishedAt ?? job.createdAt,
  };
}
