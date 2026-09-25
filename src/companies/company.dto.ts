import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  JobStatus,
  JobType,
  SalaryPeriod,
  WorkplaceType,
} from '../account/entities/job.entity';

function cleanStrings(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
    : value;
}

function normalizeEnum(value: unknown) {
  return typeof value === 'string'
    ? value
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_')
        .replace(/^ON_SITE$/, 'ONSITE')
    : value;
}

export class UpdateCompanyProfileDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  @IsOptional()
  name?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  @IsOptional()
  industry?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(60)
  @IsOptional()
  companySize?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1800)
  @Max(new Date().getUTCFullYear())
  @IsOptional()
  foundedYear?: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(180)
  @IsOptional()
  location?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  @IsOptional()
  website?: string | null;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  description?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== '')
  @IsEmail()
  @MaxLength(320)
  @IsOptional()
  contactEmail?: string | null;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  timezone?: string;

  @IsObject()
  @IsOptional()
  socialLinks?: Record<string, string>;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  @IsOptional()
  logoUrl?: string | null;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  @IsOptional()
  bannerUrl?: string | null;

}

export class JobWriteDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  @IsOptional()
  team?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @IsOptional()
  location?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  @IsOptional()
  country?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(240)
  @IsOptional()
  address?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  @IsOptional()
  category?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  @IsOptional()
  industry?: string;

  @Transform(({ value }: { value: unknown }) => normalizeEnum(value))
  @IsEnum(JobType)
  @IsOptional()
  jobType?: JobType;

  @Transform(({ value }: { value: unknown }) => normalizeEnum(value))
  @IsEnum(WorkplaceType)
  @IsOptional()
  workplaceType?: WorkplaceType;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  @IsOptional()
  summary?: string;

  @IsString()
  @MaxLength(20000)
  @IsOptional()
  description?: string;

  @Transform(({ value }: { value: unknown }) => cleanStrings(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  @IsOptional()
  responsibilities?: string[];

  @Transform(({ value }: { value: unknown }) => cleanStrings(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  @IsOptional()
  requirements?: string[];

  @Transform(({ value }: { value: unknown }) => cleanStrings(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @IsOptional()
  benefits?: string[];

  @Transform(({ value }: { value: unknown }) => cleanStrings(value))
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(80, { each: true })
  @IsOptional()
  skills?: string[];

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  salaryMin?: number | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  salaryMax?: number | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  @IsOptional()
  currency?: string;

  @Transform(({ value }: { value: unknown }) => normalizeEnum(value))
  @IsEnum(SalaryPeriod)
  @IsOptional()
  salaryPeriod?: SalaryPeriod;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(30)
  @IsOptional()
  experienceLevel?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  @IsOptional()
  minExperienceYears?: number | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  @IsOptional()
  educationLevel?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  @IsOptional()
  vacancies?: number;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== '')
  @IsDateString()
  @IsOptional()
  deadline?: string | null;
}

export class PublicJobsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  @IsOptional()
  search?: string;

  @IsString()
  @MaxLength(160)
  @IsOptional()
  location?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  category?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  industry?: string;

  @Transform(({ value }: { value: unknown }) => normalizeEnum(value))
  @IsEnum(JobType)
  @IsOptional()
  jobType?: JobType;

  @Transform(({ value }: { value: unknown }) => normalizeEnum(value))
  @IsEnum(WorkplaceType)
  @IsOptional()
  workplaceType?: WorkplaceType;

  @IsString()
  @MaxLength(30)
  @IsOptional()
  experienceLevel?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  minSalary?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  maxSalary?: number;

  @IsOptional()
  @Matches(/^(newest|salary|salary_asc|salary_desc)$/i)
  sort = 'newest';

  @IsOptional()
  @IsIn(['24h', '7d', '30d'])
  datePosted?: '24h' | '7d' | '30d';
}

export class CompaniesQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsString() @MaxLength(120) @IsOptional() search?: string;
  @IsString() @MaxLength(120) @IsOptional() industry?: string;
  @IsString() @MaxLength(160) @IsOptional() location?: string;
}

export class CompanyJobsQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsEnum(JobStatus) @IsOptional() status?: JobStatus;
  @IsString() @MaxLength(120) @IsOptional() search?: string;
}
