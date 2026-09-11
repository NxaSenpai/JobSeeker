import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { SavedJob } from './entities/saved-job.entity';
import { ApplicationDraft } from './entities/application-draft.entity';
import { AccountController } from './account.controller';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([User, SavedJob, ApplicationDraft]),
  ],
  controllers: [AccountController],
})
export class AccountModule {}
