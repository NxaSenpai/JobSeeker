import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AuditLog } from '../companies/audit-log.entity';
import { Company } from '../account/entities/company.entity';
import { Job } from '../account/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { AdminRoleGuard } from '../companies/admin-role.guard';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportService } from './admin-report.service';
import { AbuseReport } from './entities/abuse-report.entity';
import { UserReportsController } from './reports.controller';
import { ReportService } from './report.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([AbuseReport, User, Company, Job, AuditLog]),
  ],
  controllers: [UserReportsController, AdminReportsController],
  providers: [ReportService, AdminReportService, AdminRoleGuard],
})
export class ReportsModule {}
