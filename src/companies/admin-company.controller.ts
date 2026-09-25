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

@Controller('api/v1/admin/companies')
@UseGuards(SessionGuard, AdminRoleGuard)
export class AdminCompanyController {
  constructor(
    private readonly companies: CompanyService,
    private readonly admin: AdminOperationsService,
  ) {}

  @Get('pending')
  pending() {
    return this.companies.pendingForAdmin();
  }

  @Patch(':id/verify')
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
  ) {
    return this.admin.approveCompany(id, request.user.id);
  }

  @Patch(':id/unverify')
  unverify(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: SessionRequest,
  ) {
    return this.admin.unverifyCompany(id, request.user.id);
  }
}
