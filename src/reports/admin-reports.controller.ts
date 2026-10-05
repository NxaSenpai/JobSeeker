import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard, type SessionRequest } from '../auth/session.guard';
import { AdminRoleGuard } from '../companies/admin-role.guard';
import { AdminReportsQueryDto, ReportResolutionDto } from './report.dto';
import { AdminReportService } from './admin-report.service';
import { NotificationRealtimeService } from '../notifications/notification-realtime.service';

@Controller('api/v1/admin/reports')
@UseGuards(SessionGuard, AdminRoleGuard)
export class AdminReportsController {
  constructor(
    private readonly reports: AdminReportService,
    private readonly notifications: NotificationRealtimeService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@Query() query: AdminReportsQueryDto) {
    return this.reports.list(query);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.reports.get(id);
  }

  @Patch(':id/start-review')
  @Header('Cache-Control', 'private, no-store')
  async startReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
  ) {
    const result = await this.reports.startReview(id, request.user.id);
    this.notifications.publishAdminQueueUpdated();
    return result;
  }

  @Patch(':id/resolve')
  @Header('Cache-Control', 'private, no-store')
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
    @Body() dto: ReportResolutionDto,
  ) {
    const result = await this.reports.resolve(id, request.user.id, dto);
    this.notifications.publishAdminQueueUpdated();
    return result;
  }

  @Patch(':id/dismiss')
  @Header('Cache-Control', 'private, no-store')
  async dismiss(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
    @Body() dto: ReportResolutionDto,
  ) {
    const result = await this.reports.dismiss(id, request.user.id, dto);
    this.notifications.publishAdminQueueUpdated();
    return result;
  }
}
