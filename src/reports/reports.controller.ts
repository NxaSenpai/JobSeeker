import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard, type SessionRequest } from '../auth/session.guard';
import { CreateReportDto, UserReportsQueryDto } from './report.dto';
import { ReportService } from './report.service';
import { NotificationRealtimeService } from '../notifications/notification-realtime.service';

@Controller('api/v1/reports')
@UseGuards(SessionGuard)
export class UserReportsController {
  constructor(
    private readonly reports: ReportService,
    private readonly notifications: NotificationRealtimeService,
  ) {}

  @Post()
  @Header('Cache-Control', 'private, no-store')
  async submit(@Req() request: SessionRequest, @Body() dto: CreateReportDto) {
    const result = await this.reports.submit(request.user, dto);
    this.notifications.publishAdminQueueUpdated();
    return result;
  }

  @Get('me')
  @Header('Cache-Control', 'private, no-store')
  listMine(
    @Req() request: SessionRequest,
    @Query() query: UserReportsQueryDto,
  ) {
    return this.reports.listMine(request.user, query);
  }
}
