import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { SavedJob } from './entities/saved-job.entity';
import { ApplicationDraft } from './entities/application-draft.entity';
import { Resume } from './entities/resume.entity';
import { UserProfile } from './entities/user-profile.entity';
import { AccountController } from './account.controller';
import { ProfileService } from './profile.service';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { Job } from './entities/job.entity';
import { Application } from './entities/application.entity';
import { Notification } from './entities/notification.entity';
import {
  ApplicationController,
  JobApplicationController,
} from './application.controller';
import { ApplicationService } from './application.service';
import { NotificationController } from './notification.controller';
import { AvatarController } from './avatar.controller';
import { AvatarService } from './avatar.service';
import { UserProfileController } from './user-profile.controller';
import { JobsModule } from '../jobs/jobs.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    EmailModule,
    JobsModule,
    TypeOrmModule.forFeature([
      User,
      SavedJob,
      ApplicationDraft,
      UserProfile,
      Resume,
      Job,
      Application,
      Notification,
    ]),
  ],
  controllers: [
    AccountController,
    ResumeController,
    ApplicationController,
    JobApplicationController,
    NotificationController,
    AvatarController,
    UserProfileController,
  ],
  providers: [ProfileService, ResumeService, ApplicationService, AvatarService],
  exports: [ResumeService],
})
export class AccountModule {}
