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

@Controller('api/v1/reports')
@UseGuards(SessionGuard)
export class UserReportsController {
  constructor(private readonly reports: ReportService) {}

  @Post()
  @Header('Cache-Control', 'private, no-store')
  submit(@Req() request: SessionRequest, @Body() dto: CreateReportDto) {
    return this.reports.submit(request.user, dto);
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
