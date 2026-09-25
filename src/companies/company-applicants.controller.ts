import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { SessionGuard, type SessionRequest } from '../auth/session.guard';
import { JobIdDto } from '../account/account.dto';
import { ResumeService } from '../account/resume.service';
import { CompanyRoleGuard } from './company-role.guard';
import { CompanyService } from './company.service';
import {
  CompanyApplicantQueryDto,
  CreateApplicationNoteDto,
  UpdateCompanyApplicationStatusDto,
} from './company-applicants.dto';
import { CompanyApplicantsService } from './company-applicants.service';

@Controller('api/v1/company')
@UseGuards(SessionGuard, CompanyRoleGuard)
export class CompanyApplicantsController {
  constructor(
    private readonly applicants: CompanyApplicantsService,
    private readonly companies: CompanyService,
    private readonly resumes: ResumeService,
  ) {}

  @Get('applications')
  list(
    @Req() request: SessionRequest,
    @Query() query: CompanyApplicantQueryDto,
  ) {
    return this.applicants.list(request.user, query);
  }

  @Get('jobs/:jobId/applications')
  listForJob(
    @Req() request: SessionRequest,
    @Param() params: JobIdDto,
    @Query() query: CompanyApplicantQueryDto,
  ) {
    return this.applicants.listForJob(request.user, params.jobId, query);
  }

  @Get('applications/:id')
  get(@Req() request: SessionRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicants.get(request.user, id);
  }

  @Patch('applications/:id/status')
  updateStatus(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyApplicationStatusDto,
  ) {
    return this.applicants.updateStatus(request.user, id, dto);
  }

  @Get('applications/:id/notes')
  listNotes(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applicants.listNotes(request.user, id);
  }

  @Post('applications/:id/notes')
  addNote(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateApplicationNoteDto,
  ) {
    return this.applicants.addNote(request.user, id, dto);
  }

  @Delete('applications/:id/notes/:noteId')
  deleteNote(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    return this.applicants.deleteNote(request.user, id, noteId);
  }

  @Get('applications/:id/resume')
  async downloadResume(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const company = await this.companies.ensureOwnProfile(request.user);
    const { resume, stream } = await this.resumes.openForCompany(
      company.id,
      id,
    );
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(resume.fileSize),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(resume.fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });
    return new StreamableFile(stream);
  }
}
