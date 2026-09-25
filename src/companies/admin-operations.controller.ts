import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard, type SessionRequest } from '../auth/session.guard';
import { AdminRoleGuard } from './admin-role.guard';
import {
  AdminCompaniesQueryDto,
  AdminJobsQueryDto,
  AdminListQueryDto,
  AdminReasonDto,
  AdminUsersQueryDto,
} from './admin.dto';
import { AdminOperationsService } from './admin-operations.service';

@Controller('api/v1/admin')
@UseGuards(SessionGuard, AdminRoleGuard)
export class AdminOperationsController {
  constructor(private readonly admin: AdminOperationsService) {}

  @Get('users')
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getUser(id);
  }

  @Patch('users/:id/suspend')
  suspendUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
    @Body() dto: AdminReasonDto,
  ) {
    return this.admin.suspendUser(id, request.user.id, dto);
  }

  @Patch('users/:id/unsuspend')
  unsuspendUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
  ) {
    return this.admin.unsuspendUser(id, request.user.id);
  }

  @Get('companies')
  listCompanies(@Query() query: AdminCompaniesQueryDto) {
    return this.admin.listCompanies(query);
  }

  @Patch('companies/:id/approve')
  approveCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
  ) {
    return this.admin.approveCompany(id, request.user.id);
  }

  @Patch('companies/:id/reject')
  rejectCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
    @Body() dto: AdminReasonDto,
  ) {
    return this.admin.rejectCompany(id, request.user.id, dto);
  }

  @Patch('companies/:id/suspend')
  suspendCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
    @Body() dto: AdminReasonDto,
  ) {
    return this.admin.suspendCompany(id, request.user.id, dto);
  }

  @Patch('companies/:id/unsuspend')
  unsuspendCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
  ) {
    return this.admin.unsuspendCompany(id, request.user.id);
  }

  @Get('jobs')
  listJobs(@Query() query: AdminJobsQueryDto) {
    return this.admin.listJobs(query);
  }

  @Patch('jobs/:id/approve')
  approveJob(@Param('id') id: string, @Req() request: SessionRequest) {
    return this.admin.approveJob(id, request.user.id);
  }

  @Patch('jobs/:id/reject')
  rejectJob(
    @Param('id') id: string,
    @Req() request: SessionRequest,
    @Body() dto: AdminReasonDto,
  ) {
    return this.admin.rejectJob(id, request.user.id, dto);
  }

  @Patch('jobs/:id/hide')
  hideJob(
    @Param('id') id: string,
    @Req() request: SessionRequest,
    @Body() dto: AdminReasonDto,
  ) {
    return this.admin.hideJob(id, request.user.id, dto);
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: AdminListQueryDto) {
    return this.admin.listAuditLogs(query);
  }
}
