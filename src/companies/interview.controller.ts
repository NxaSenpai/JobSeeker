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
import { JobSeekerGuard } from '../account/job-seeker.guard';
import { CompanyRoleGuard } from './company-role.guard';
import {
  InterviewListQueryDto,
  ScheduleInterviewDto,
  UpdateInterviewDto,
} from './interview.dto';
import { InterviewService } from './interview.service';

@Controller('api/v1/company')
@UseGuards(SessionGuard, CompanyRoleGuard)
export class CompanyInterviewController {
  constructor(private readonly interviews: InterviewService) {}

  @Post('applications/:applicationId/interviews')
  schedule(
    @Req() request: SessionRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.interviews.schedule(request.user, applicationId, dto);
  }

  @Get('interviews')
  list(@Req() request: SessionRequest, @Query() query: InterviewListQueryDto) {
    return this.interviews.listForCompany(request.user, query);
  }

  @Patch('interviews/:id')
  update(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviews.update(request.user, id, dto);
  }

  @Patch('interviews/:id/cancel')
  cancel(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.interviews.cancel(request.user, id);
  }
}

@Controller('api/v1/interviews')
@UseGuards(SessionGuard, JobSeekerGuard)
export class CandidateInterviewController {
  constructor(private readonly interviews: InterviewService) {}

  @Get('me')
  list(@Req() request: SessionRequest, @Query() query: InterviewListQueryDto) {
    return this.interviews.listForCandidate(request.user, query);
  }
}
