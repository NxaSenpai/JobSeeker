import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from '../account/account.module';
import { AuthModule } from '../auth/auth.module';
import { Application } from '../account/entities/application.entity';
import { ApplicationNote } from '../account/entities/application-note.entity';
import { Interview } from '../account/entities/interview.entity';
import { Company } from '../account/entities/company.entity';
import { Job } from '../account/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { JobsModule } from '../jobs/jobs.module';
import {
  CompanyJobsController,
  CompanyLogoController,
  CompanyProfileController,
  PublicCompaniesController,
} from './company.controller';
import { AdminCompanyController } from './admin-company.controller';
import { AdminOperationsController } from './admin-operations.controller';
import { AdminUserAvatarController } from './admin-user-avatar.controller';
import { AdminOperationsService } from './admin-operations.service';
import { AdminRoleGuard } from './admin-role.guard';
import { AuditLog } from './audit-log.entity';
import { CompanyJobsService } from './company-jobs.service';
import { CompanyLogoService } from './company-logo.service';
import { CompanyRoleGuard } from './company-role.guard';
import { CompanyService } from './company.service';
import { CompanyApplicantsController } from './company-applicants.controller';
import { CompanyApplicantsService } from './company-applicants.service';
import {
  CandidateInterviewController,
  CompanyInterviewController,
} from './interview.controller';
import { InterviewService } from './interview.service';
import { JobSeekerGuard } from '../account/job-seeker.guard';
import { ApplicationMessage } from '../account/entities/application-message.entity';
import { Notification } from '../account/entities/notification.entity';
import { EmailModule } from '../email/email.module';
import {
  CandidateApplicationMessagesController,
  CompanyApplicationMessagesController,
} from './application-messaging.controller';
import { ApplicationMessagingService } from './application-messaging.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompanyNotificationController } from './company-notification.controller';

@Module({
  imports: [
    AuthModule,
    AccountModule,
    NotificationsModule,
    EmailModule,
    JobsModule,
    TypeOrmModule.forFeature([
      User,
      Company,
      Job,
      Application,
      ApplicationNote,
      Interview,
      ApplicationMessage,
      Notification,
      AuditLog,
    ]),
  ],
  controllers: [
    PublicCompaniesController,
    CompanyProfileController,
    CompanyLogoController,
    CompanyJobsController,
    AdminCompanyController,
    AdminOperationsController,
    AdminUserAvatarController,
    CompanyApplicantsController,
    CompanyNotificationController,
    CompanyInterviewController,
    CandidateInterviewController,
    CompanyApplicationMessagesController,
    CandidateApplicationMessagesController,
  ],
  providers: [
    CompanyService,
    CompanyJobsService,
    CompanyLogoService,
    CompanyApplicantsService,
    InterviewService,
    ApplicationMessagingService,
    AdminOperationsService,
    CompanyRoleGuard,
    JobSeekerGuard,
    AdminRoleGuard,
  ],
})
export class CompanyModule {}
