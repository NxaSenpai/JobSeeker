import { Transform, Type } from 'class-transformer';
import {
  EducationDto,
  ExperienceDto,
  LanguageDto,
} from './profile-details.dto';
import {
  IsBoolean,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';

export class JobIdDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  jobId: string;
}

export class UpdateProfileDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  firstName?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  lastName?: string;

  @IsString()
  @MaxLength(160)
  @IsOptional()
  headline?: string;

  @IsString()
  @MaxLength(160)
  @IsOptional()
  location?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  bio?: string;

  @IsString()
  @MaxLength(40)
  @IsOptional()
  phone?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== '')
  @IsDateString()
  dateOfBirth?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  websiteUrl?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  linkedinUrl?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  githubUrl?: string;

  @IsBoolean()
  @IsOptional()
  isOpenToWork?: boolean;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  skills?: string[];

  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience?: ExperienceDto[];

  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];
}

export class SaveDraftDto {
  @IsOptional()
  @IsUUID()
  resumeId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ValidateIf((_o, v: unknown) => v !== undefined && v !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  portfolioUrl?: string;

  @IsString()
  @MaxLength(10000)
  coverLetter: string;

  @IsString()
  @MaxLength(2048)
  @ValidateIf((_object, value: unknown) => value !== '')
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_valid_protocol: true,
  })
  resumeUrl: string;
}
