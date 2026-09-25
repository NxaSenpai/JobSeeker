import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { JobModerationStatus, JobStatus } from '../account/entities/job.entity';
import { UserRole } from '../users/entities/user.entity';

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class AdminListQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @Transform(({ value }) => clean(value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  search?: string;
}

export class AdminUsersQueryDto extends AdminListQueryDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @Transform(({ value }: { value: unknown }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : value,
  )
  @IsBoolean()
  @IsOptional()
  suspended?: boolean;
}

export enum AdminCompanyStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  SUSPENDED = 'SUSPENDED',
}

export class AdminCompaniesQueryDto extends AdminListQueryDto {
  @IsEnum(AdminCompanyStatus)
  @IsOptional()
  status?: AdminCompanyStatus;
}

export class AdminJobsQueryDto extends AdminListQueryDto {
  @IsEnum(JobModerationStatus)
  @IsOptional()
  moderationStatus?: JobModerationStatus;

  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;
}

export class AdminReasonDto {
  @Transform(({ value }) => clean(value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
