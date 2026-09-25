import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';

export enum JobStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum JobModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  HIDDEN = 'HIDDEN',
}

export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  INTERNSHIP = 'INTERNSHIP',
  CONTRACT = 'CONTRACT',
  TEMPORARY = 'TEMPORARY',
  FREELANCE = 'FREELANCE',
}

export enum WorkplaceType {
  REMOTE = 'REMOTE',
  ONSITE = 'ONSITE',
  HYBRID = 'HYBRID',
}

export enum SalaryPeriod {
  HOUR = 'HOUR',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

@Entity('jobs')
@Check('CHK_jobs_company_owner', '"isDemo" = true OR "companyId" IS NOT NULL')
@Check(
  'CHK_jobs_status',
  "\"status\" IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')",
)
@Check(
  'CHK_jobs_moderation_status',
  "\"moderationStatus\" IN ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN')",
)
@Check(
  'CHK_jobs_moderation_note',
  '("moderationStatus" IN (\'REJECTED\', \'HIDDEN\') AND "moderationNote" IS NOT NULL) OR ("moderationStatus" IN (\'PENDING\', \'APPROVED\') AND "moderationNote" IS NULL)',
)
@Check(
  'CHK_jobs_type',
  "\"jobType\" IN ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'TEMPORARY', 'FREELANCE')",
)
@Check(
  'CHK_jobs_workplace',
  "\"workplaceType\" IN ('REMOTE', 'ONSITE', 'HYBRID')",
)
@Check(
  'CHK_jobs_salary_range',
  '"salaryMin" IS NULL OR "salaryMax" IS NULL OR "salaryMax" >= "salaryMin"',
)
@Check('CHK_jobs_vacancies', '"vacancies" >= 1')
@Check(
  'CHK_jobs_experience',
  '"minExperienceYears" IS NULL OR "minExperienceYears" >= 0',
)
@Index('IDX_jobs_status_createdAt', ['status', 'createdAt'])
@Index('IDX_jobs_company_status', ['companyId', 'status'])
@Index('IDX_jobs_category', ['category'])
@Index('IDX_jobs_industry', ['industry'])
@Index('IDX_jobs_location', ['location'])
@Index('IDX_jobs_moderation_updatedAt', ['moderationStatus', 'updatedAt'])
export class Job {
  // Human-readable IDs remain stable for existing saved jobs and applications.
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  companyProfile: Company | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  // Kept as a snapshot for legacy demo listings and historical applications.
  @Column({ type: 'varchar', length: 200 })
  company: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  team: string | null;

  @Column({ type: 'varchar', length: 200 })
  location: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  industry: string | null;

  @Column({ type: 'varchar', length: 30, default: JobType.FULL_TIME })
  jobType: JobType;

  @Column({ type: 'varchar', length: 20, default: WorkplaceType.ONSITE })
  workplaceType: WorkplaceType;

  @Column({ type: 'varchar', length: 500, default: '' })
  summary: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  responsibilities: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  requirements: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  benefits: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  skills: string[];

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  salaryMin: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  salaryMax: string | null;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: SalaryPeriod.YEAR })
  salaryPeriod: SalaryPeriod;

  @Column({ type: 'varchar', length: 30, nullable: true })
  experienceLevel: string | null;

  @Column({ type: 'smallint', nullable: true })
  minExperienceYears: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  educationLevel: string | null;

  @Column({ type: 'smallint', default: 1 })
  vacancies: number;

  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date | null;

  @Column({ type: 'varchar', length: 20, default: JobStatus.PUBLISHED })
  status: JobStatus;

  @Column({ type: 'varchar', length: 20, default: JobModerationStatus.PENDING })
  moderationStatus: JobModerationStatus;

  @Column({ type: 'text', nullable: true })
  moderationNote: string | null;

  @Column({ default: false })
  isDemo: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
