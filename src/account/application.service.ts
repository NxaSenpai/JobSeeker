import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ApplicationQueryDto, SubmitApplicationDto } from './application.dto';
import { Application, ApplicationStatus } from './entities/application.entity';
import { ApplicationDraft } from './entities/application-draft.entity';
import { Job, JobModerationStatus, JobStatus } from './entities/job.entity';
import { Company } from './entities/company.entity';
import { Notification } from './entities/notification.entity';
import { Resume } from './entities/resume.entity';
import { ProfileService } from './profile.service';
import { EmailService } from '../email/email.service';
import { NotificationRealtimeService } from '../notifications/notification-realtime.service';

@Injectable()
export class ApplicationService {
  constructor(
    private readonly database: DataSource,
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    private readonly profiles: ProfileService,
    private readonly email: EmailService,
    private readonly realtimeNotifications: NotificationRealtimeService,
  ) {}

  async submit(user: User, jobId: string, dto: SubmitApplicationDto) {
    const profile = await this.profiles.getForUser(user);
    try {
      const submitted = await this.database.transaction(async (manager) => {
        const job = await manager.findOne(Job, {
          where: { id: jobId },
          lock: { mode: 'pessimistic_read' },
        });
        if (
          !job ||
          job.status !== JobStatus.PUBLISHED ||
          job.moderationStatus !== JobModerationStatus.APPROVED
        )
          throw new NotFoundException('This job is no longer available.');
        let company: Company | null = null;
        if (!job.isDemo) {
          company = job.companyId
            ? await manager.findOne(Company, {
                where: { id: job.companyId },
                lock: { mode: 'pessimistic_read' },
              })
            : null;
          if (!company?.isVerified || company.suspendedAt)
            throw new NotFoundException('This job is no longer available.');
        }
        if (job.deadline && job.deadline.getTime() <= Date.now())
          throw new BadRequestException('The application deadline has passed.');
        const resume = await manager.findOne(Resume, {
          where: { id: dto.resumeId, profileId: profile.id },
          lock: { mode: 'pessimistic_read' },
        });
        if (!resume)
          throw new NotFoundException('Choose a résumé from your own profile.');
        const application = await manager.save(
          Application,
          manager.create(Application, {
            userId: user.id,
            jobId,
            resumeId: resume.id,
            description: dto.description,
            coverLetter: dto.coverLetter?.trim() ?? '',
            phone: dto.phone?.trim() ?? '',
            portfolioUrl: dto.portfolioUrl ?? '',
            status: ApplicationStatus.APPLIED,
            candidate: {
              ...this.profiles.publicProfile(profile),
              email: user.email,
            },
            history: [
              {
                status: ApplicationStatus.APPLIED,
                at: new Date().toISOString(),
              },
            ],
          }),
        );
        await manager.delete(ApplicationDraft, { userId: user.id, jobId });
        const notification = await manager.save(
          Notification,
          manager.create(Notification, {
            userId: user.id,
            title: 'Application submitted',
            message: `${job.title} at ${job.company}${job.isDemo ? ' — sample listing; saved for demonstration only.' : ' — your application has been recorded.'}`,
            link: `/applications/${application.id}`,
            readAt: null,
          }),
        );
        const companyOwner = company?.ownerUserId
          ? await manager.findOneBy(User, { id: company.ownerUserId })
          : null;
        return {
          application: this.present({ ...application, job, resume }),
          companyEmail: companyOwner?.email ?? null,
          notification,
        };
      });
      this.realtimeNotifications.publish(submitted.notification);
      if (submitted.companyEmail) {
        await this.email.sendActivityEmail(
          submitted.companyEmail,
          'APPLICATION_RECEIVED',
          `/company/applications/${submitted.application.id}`,
        );
      }
      return { application: submitted.application };
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException(
          'You have already applied for this job. View your existing application.',
        );
      throw error;
    }
  }

  async list(userId: string, query: ApplicationQueryDto) {
    const [applications, total] = await this.applications.findAndCount({
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.jobId ? { jobId: query.jobId } : {}),
      },
      relations: { job: true, resume: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return {
      applications: applications.map((item) => this.present(item)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async get(userId: string, id: string) {
    const application = await this.applications.findOne({
      where: { id, userId },
      relations: { job: true, resume: true },
    });
    if (!application) throw new NotFoundException('Application was not found.');
    return { application: this.present(application) };
  }

  async withdraw(userId: string, id: string) {
    const result = await this.database.transaction(async (manager) => {
      const application = await manager.findOne(Application, {
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!application)
        throw new NotFoundException('Application was not found.');
      if (application.status === ApplicationStatus.WITHDRAWN)
        return { companyEmail: null, notification: null };
      if (
        [ApplicationStatus.REJECTED, ApplicationStatus.HIRED].includes(
          application.status,
        )
      )
        throw new ConflictException(
          'This application has already been finalized.',
        );
      application.status = ApplicationStatus.WITHDRAWN;
      application.history.push({
        status: ApplicationStatus.WITHDRAWN,
        at: new Date().toISOString(),
      });
      await manager.save(application);
      const notification = await manager.save(
        Notification,
        manager.create(Notification, {
          userId,
          title: 'Application withdrawn',
          message: 'You withdrew this application.',
          link: `/applications/${id}`,
          readAt: null,
        }),
      );
      const job = await manager.findOneBy(Job, { id: application.jobId });
      const company = job?.companyId
        ? await manager.findOneBy(Company, { id: job.companyId })
        : null;
      const owner = company?.ownerUserId
        ? await manager.findOneBy(User, { id: company.ownerUserId })
        : null;
      return { companyEmail: owner?.email ?? null, notification };
    });
    if (result.notification)
      this.realtimeNotifications.publish(result.notification);
    if (result.companyEmail) {
      await this.email.sendActivityEmail(
        result.companyEmail,
        'APPLICATION_WITHDRAWN',
        `/company/applications/${id}`,
      );
    }
    return this.get(userId, id);
  }

  private present(application: Application) {
    const { resume, ...data } = application;
    return {
      ...data,
      resume: {
        id: resume.id,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
      },
    };
  }
}
