import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard, type SessionRequest } from '../auth/session.guard';
import { JobService } from '../account/job.service';
import {
  CompaniesQueryDto,
  CompanyJobsQueryDto,
  JobWriteDto,
  PublicJobsQueryDto,
  UpdateCompanyProfileDto,
} from './company.dto';
import { CompanyService } from './company.service';
import { CompanyJobsService } from './company-jobs.service';
import { CompanyRoleGuard } from './company-role.guard';

@Controller('api/v1/companies')
export class PublicCompaniesController {
  constructor(
    private readonly companies: CompanyService,
    private readonly jobs: JobService,
  ) {}

  @Get()
  list(@Query() query: CompaniesQueryDto) {
    return this.companies.listPublic(query);
  }

  @Get(':id/jobs')
  async jobsForCompany(
    @Param('id') id: string,
    @Query() query: PublicJobsQueryDto,
  ) {
    const company = await this.companies.findPublic(id);
    return {
      company: this.companies.present(company),
      ...(await this.jobs.list(query, company.id)),
    };
  }

  @Get(':id')
  profile(@Param('id') id: string) {
    return this.companies.publicProfile(id);
  }
}

@Controller('api/v1/company/profile')
@UseGuards(SessionGuard, CompanyRoleGuard)
export class CompanyProfileController {
  constructor(private readonly companies: CompanyService) {}

  @Get()
  get(@Req() request: SessionRequest) {
    return this.companies.ownProfile(request.user);
  }

  @Patch()
  update(
    @Req() request: SessionRequest,
    @Body() dto: UpdateCompanyProfileDto,
  ) {
    return this.companies.updateOwnProfile(request.user, dto);
  }
}

@Controller('api/v1/company/jobs')
@UseGuards(SessionGuard, CompanyRoleGuard)
export class CompanyJobsController {
  constructor(private readonly jobs: CompanyJobsService) {}

  @Get()
  list(
    @Req() request: SessionRequest,
    @Query() query: CompanyJobsQueryDto,
  ) {
    return this.jobs.list(request.user, query);
  }

  @Post()
  create(@Req() request: SessionRequest, @Body() dto: JobWriteDto) {
    return this.jobs.create(request.user, dto);
  }

  @Get(':id')
  get(@Req() request: SessionRequest, @Param('id') id: string) {
    return this.jobs.get(request.user, id);
  }

  @Patch(':id')
  update(
    @Req() request: SessionRequest,
    @Param('id') id: string,
    @Body() dto: JobWriteDto,
  ) {
    return this.jobs.update(request.user, id, dto);
  }

  @Patch(':id/publish')
  publish(@Req() request: SessionRequest, @Param('id') id: string) {
    return this.jobs.publish(request.user, id);
  }

  @Patch(':id/unpublish')
  unpublish(@Req() request: SessionRequest, @Param('id') id: string) {
    return this.jobs.unpublish(request.user, id);
  }

  @Patch(':id/close')
  close(@Req() request: SessionRequest, @Param('id') id: string) {
    return this.jobs.close(request.user, id);
  }

  @Patch(':id/archive')
  archive(@Req() request: SessionRequest, @Param('id') id: string) {
    return this.jobs.archive(request.user, id);
  }

  @Delete(':id')
  remove(@Req() request: SessionRequest, @Param('id') id: string) {
    // Archiving retains applications and their FK-protected records.
    return this.jobs.archive(request.user, id);
  }
}
