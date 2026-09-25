import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ReportCategory,
  ReportStatus,
  ReportSubjectType,
} from './entities/abuse-report.entity';

function trim(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateReportDto {
  @IsEnum(ReportSubjectType)
  subjectType: ReportSubjectType;

  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  subjectId: string;

  @IsEnum(ReportCategory)
  category: ReportCategory;

  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @MinLength(20)
  @MaxLength(3000)
  description: string;
}

export class UserReportsQueryDto {
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

  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;
}

export class AdminReportsQueryDto extends UserReportsQueryDto {
  @IsEnum(ReportSubjectType)
  @IsOptional()
  subjectType?: ReportSubjectType;

  @IsEnum(ReportCategory)
  @IsOptional()
  category?: ReportCategory;

  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  search?: string;
}

export class ReportResolutionDto {
  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note: string;
}
