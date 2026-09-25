import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard, type SessionRequest } from '../auth/session.guard';
import { JobIdDto } from './account.dto';
import { ApplicationQueryDto, SubmitApplicationDto } from './application.dto';
import { ApplicationService } from './application.service';
import { JobSeekerGuard } from './job-seeker.guard';
import { JobService } from './job.service';
import { PublicJobsQueryDto } from '../companies/company.dto';

@Controller('api/v1/jobs')
export class JobApplicationController {
  constructor(
    private readonly applications: ApplicationService,
    private readonly jobs: JobService,
  ) {}

  @Get()
  listJobs(@Query() query: PublicJobsQueryDto) {
    return this.jobs.list(query);
  }

  @Get('featured')
  featuredJobs() {
    return this.jobs.featured();
  }

  @Get('categories')
  jobCategories() {
    return this.jobs.categories();
  }

  @Get(':jobId/similar')
  similarJobs(@Param() params: JobIdDto) {
    return this.jobs.similar(params.jobId);
  }

  @Get(':jobId') get(@Param() params: JobIdDto) {
    return this.jobs.get(params.jobId);
  }
  @Post(':jobId/applications')
  @UseGuards(SessionGuard, JobSeekerGuard)
  submit(
    @Req() request: SessionRequest,
    @Param() params: JobIdDto,
    @Body() dto: SubmitApplicationDto,
  ) {
    return this.applications.submit(request.user, params.jobId, dto);
  }
}

@Controller(['api/v1/applications/me', 'api/v1/account/applications'])
@UseGuards(SessionGuard, JobSeekerGuard)
export class ApplicationController {
  constructor(private readonly applications: ApplicationService) {}
  @Get() list(
    @Req() request: SessionRequest,
    @Query() query: ApplicationQueryDto,
  ) {
    return this.applications.list(request.user.id, query);
  }
  @Get(':id') get(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applications.get(request.user.id, id);
  }
  @Get(':id/history') async history(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      history: (await this.applications.get(request.user.id, id)).application
        .history,
    };
  }
  @Patch(':id/withdraw') withdraw(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applications.withdraw(request.user.id, id);
  }
}
