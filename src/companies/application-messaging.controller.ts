import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard, type SessionRequest } from '../auth/session.guard';
import { JobSeekerGuard } from '../account/job-seeker.guard';
import { CompanyRoleGuard } from './company-role.guard';
import {
  ApplicationMessageQueryDto,
  SendApplicationMessageDto,
} from './application-message.dto';
import { ApplicationMessagingService } from './application-messaging.service';

@Controller('api/v1/company/applications/:id/messages')
@UseGuards(SessionGuard, CompanyRoleGuard)
export class CompanyApplicationMessagesController {
  constructor(private readonly messaging: ApplicationMessagingService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Query() query: ApplicationMessageQueryDto,
  ) {
    return this.messaging.listForCompany(request.user, applicationId, query);
  }

  @Post()
  @Header('Cache-Control', 'private, no-store')
  send(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() dto: SendApplicationMessageDto,
  ) {
    return this.messaging.sendFromCompany(request.user, applicationId, dto);
  }

  @Patch('read')
  @Header('Cache-Control', 'private, no-store')
  read(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) applicationId: string,
  ) {
    return this.messaging.markCompanyThreadRead(request.user, applicationId);
  }
}

@Controller('api/v1/applications/me/:id/messages')
@UseGuards(SessionGuard, JobSeekerGuard)
export class CandidateApplicationMessagesController {
  constructor(private readonly messaging: ApplicationMessagingService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Query() query: ApplicationMessageQueryDto,
  ) {
    return this.messaging.listForCandidate(request.user, applicationId, query);
  }

  @Post()
  @Header('Cache-Control', 'private, no-store')
  send(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() dto: SendApplicationMessageDto,
  ) {
    return this.messaging.sendFromCandidate(request.user, applicationId, dto);
  }

  @Patch('read')
  @Header('Cache-Control', 'private, no-store')
  read(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) applicationId: string,
  ) {
    return this.messaging.markCandidateThreadRead(request.user, applicationId);
  }
}
