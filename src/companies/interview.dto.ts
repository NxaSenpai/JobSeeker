import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { InterviewType } from '../account/entities/interview.entity';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class ScheduleInterviewDto {
  @IsDateString()
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/i)
  scheduledAt: string;

  @IsEnum(InterviewType)
  type: InterviewType;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MaxLength(500)
  @IsOptional()
  location?: string | null;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  @IsOptional()
  meetingUrl?: string | null;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  notes?: string;
}

export class UpdateInterviewDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsDateString()
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/i)
  scheduledAt?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(InterviewType)
  type?: InterviewType;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MaxLength(500)
  @IsOptional()
  location?: string | null;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  @IsOptional()
  meetingUrl?: string | null;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class InterviewListQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
