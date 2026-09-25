import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApplicationStatus } from './entities/application.entity';

export class SubmitApplicationDto {
  @IsUUID() resumeId: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(20)
  @MaxLength(3000)
  description: string;
  @IsOptional() @IsString() @MaxLength(10000) coverLetter?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ValidateIf((_o, value: unknown) => value !== undefined && value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  portfolioUrl?: string;
  @Equals(true, {
    message:
      'Please confirm that the application details may be shared for this role.',
  })
  consent: boolean;
}

export class ApplicationQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(ApplicationStatus) status?: ApplicationStatus;
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  jobId?: string;
}
