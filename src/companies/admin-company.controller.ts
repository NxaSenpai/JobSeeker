import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard, type SessionRequest } from '../auth/session.guard';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminOperationsService } from './admin-operations.service';
import { CompanyService } from './company.service';
import { NotificationRealtimeService } from '../notifications/notification-realtime.service';

@Controller('api/v1/admin/companies')
@UseGuards(SessionGuard, AdminRoleGuard)
export class AdminCompanyController {
  constructor(
    private readonly companies: CompanyService,
    private readonly admin: AdminOperationsService,
    private readonly notifications: NotificationRealtimeService,
  ) {}

  @Get('pending')
  pending() {
    return this.companies.pendingForAdmin();
  }

  @Patch(':id/verify')
  async verify(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
  ) {
    const result = await this.admin.approveCompany(id, request.user.id);
    this.notifications.publishAdminQueueUpdated();
    return result;
  }

  @Patch(':id/unverify')
  async unverify(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
  ) {
    const result = await this.admin.unverifyCompany(id, request.user.id);
    this.notifications.publishAdminQueueUpdated();
    return result;
  }
}
