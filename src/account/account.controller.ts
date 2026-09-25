import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Put,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionGuard } from '../auth/session.guard';
import type { SessionRequest } from '../auth/session.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { SavedJob } from './entities/saved-job.entity';
import { ApplicationDraft } from './entities/application-draft.entity';
import { JobIdDto, SaveDraftDto, UpdateProfileDto } from './account.dto';
import { ProfileService } from './profile.service';
import { Resume } from './entities/resume.entity';

@Controller('api/v1/account')
@UseGuards(SessionGuard)
export class AccountController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(SavedJob) private readonly saved: Repository<SavedJob>,
    @InjectRepository(ApplicationDraft)
    private readonly drafts: Repository<ApplicationDraft>,
    private readonly profiles: ProfileService,
  ) {}

  private jobSeeker(request: SessionRequest) {
    if (request.user.role !== UserRole.USER)
      throw new ForbiddenException('This action is available to job seekers.');
    return request.user.id;
  }

  @Get('profile')
  profile(@Req() request: SessionRequest) {
    this.jobSeeker(request);
    return this.profiles.getProfile(request.user);
  }

  @Patch('profile')
  updateProfile(@Req() request: SessionRequest, @Body() dto: UpdateProfileDto) {
    this.jobSeeker(request);
    return this.profiles.updateProfile(request.user, dto);
  }

  @Get('saved-jobs')
  async savedJobs(@Req() request: SessionRequest) {
    return {
      jobs: await this.saved.find({
        where: { userId: this.jobSeeker(request) },
        order: { createdAt: 'DESC' },
      }),
    };
  }

  @Put('saved-jobs/:jobId')
  async saveJob(@Req() request: SessionRequest, @Param() params: JobIdDto) {
    await this.saved.upsert(
      { userId: this.jobSeeker(request), jobId: params.jobId },
      ['userId', 'jobId'],
    );
    return { saved: true };
  }

  @Delete('saved-jobs/:jobId')
  async unsaveJob(@Req() request: SessionRequest, @Param() params: JobIdDto) {
    await this.saved.delete({
      userId: this.jobSeeker(request),
      jobId: params.jobId,
    });
    return { saved: false };
  }

  @Get('application-drafts')
  async applicationDrafts(@Req() request: SessionRequest) {
    return {
      drafts: await this.drafts.find({
        where: { userId: this.jobSeeker(request) },
        order: { updatedAt: 'DESC' },
      }),
    };
  }

  @Put('application-drafts/:jobId')
  async saveDraft(
    @Req() request: SessionRequest,
    @Param() params: JobIdDto,
    @Body() dto: SaveDraftDto,
  ) {
    const userId = this.jobSeeker(request);
    if (dto.resumeId) {
      const profile = await this.profiles.getForUser(request.user);
      const resume = await this.drafts.manager.findOneBy(Resume, {
        id: dto.resumeId,
        profileId: profile.id,
      });
      if (!resume)
        throw new NotFoundException('Choose a résumé from your own profile.');
    }
    await this.drafts.upsert(
      {
        userId,
        jobId: params.jobId,
        coverLetter: dto.coverLetter,
        resumeUrl: dto.resumeUrl,
        resumeId: dto.resumeId ?? null,
        description: dto.description ?? '',
        phone: dto.phone ?? '',
        portfolioUrl: dto.portfolioUrl ?? '',
      },
      ['userId', 'jobId'],
    );
    return {
      draft: await this.drafts.findOneByOrFail({ userId, jobId: params.jobId }),
    };
  }

  @Delete('application-drafts/:jobId')
  async deleteDraft(@Req() request: SessionRequest, @Param() params: JobIdDto) {
    await this.drafts.delete({
      userId: this.jobSeeker(request),
      jobId: params.jobId,
    });
    return { removed: true };
  }
}
