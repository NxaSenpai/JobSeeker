import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
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
  firstName: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @MaxLength(160)
  headline: string;

  @IsString()
  @MaxLength(160)
  location: string;

  @IsString()
  @MaxLength(2000)
  bio: string;
}

export class SaveDraftDto {
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
