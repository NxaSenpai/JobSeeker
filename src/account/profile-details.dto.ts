import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class EducationDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  school: string;
  @IsString() @IsNotEmpty() @MaxLength(160) degree: string;
  @IsString() @MaxLength(160) fieldOfStudy: string;
  @IsDateString({ strict: true }) startDate: string;
  @ValidateIf((_o, v: unknown) => v !== '')
  @IsDateString({ strict: true })
  endDate: string;
  @IsString() @MaxLength(2000) description: string;
}

export class ExperienceDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  company: string;
  @IsString() @IsNotEmpty() @MaxLength(160) position: string;
  @IsIn([
    'Full-time',
    'Part-time',
    'Contract',
    'Internship',
    'Freelance',
    'Temporary',
  ])
  employmentType: string;
  @IsDateString({ strict: true }) startDate: string;
  @ValidateIf((_o, v: unknown) => v !== '')
  @IsDateString({ strict: true })
  endDate: string;
  @IsBoolean() current: boolean;
  @IsString() @MaxLength(2000) description: string;
}

export class LanguageDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;
  @IsIn(['Basic', 'Conversational', 'Professional', 'Fluent', 'Native'])
  proficiency: string;
}
