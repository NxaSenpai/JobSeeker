import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { SessionGuard } from '../auth/session.guard';
import type { SessionRequest } from '../auth/session.guard';
import { UserRole } from '../users/entities/user.entity';
import { ResumeService } from './resume.service';

@Controller(['api/v1/account/resumes', 'api/v1/users/me/resumes'])
@UseGuards(SessionGuard)
export class ResumeController {
  constructor(private readonly resumes: ResumeService) {}

  @Get()
  list(@Req() request: SessionRequest) {
    this.jobSeeker(request);
    return this.resumes.list(request.user);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @Req() request: SessionRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    this.jobSeeker(request);
    return this.resumes.upload(request.user, file);
  }

  @Get(':id/preview')
  async preview(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.jobSeeker(request);
    const { resume, stream } = await this.resumes.open(request.user, id);
    this.fileHeaders(response, resume.fileName, resume.fileSize, 'inline');
    return new StreamableFile(stream);
  }

  @Get(':id/download')
  async download(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.jobSeeker(request);
    const { resume, stream } = await this.resumes.open(request.user, id);
    this.fileHeaders(response, resume.fileName, resume.fileSize, 'attachment');
    return new StreamableFile(stream);
  }

  @Patch([':id/default', ':id/primary'])
  setDefault(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.jobSeeker(request);
    return this.resumes.setDefault(request.user, id);
  }

  @Delete(':id')
  remove(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.jobSeeker(request);
    return this.resumes.remove(request.user, id);
  }

  private jobSeeker(request: SessionRequest) {
    if (request.user.role !== UserRole.USER) {
      throw new ForbiddenException('This action is available to job seekers.');
    }
  }

  private fileHeaders(
    response: Response,
    fileName: string,
    fileSize: number,
    disposition: 'inline' | 'attachment',
  ) {
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(fileSize),
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
  }
}
