import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  Application,
  ApplicationStatus,
} from '../account/entities/application.entity';
import {
  Interview,
  InterviewStatus,
  InterviewType,
} from '../account/entities/interview.entity';
import { Notification } from '../account/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { CompanyService } from './company.service';
import { EmailService } from '../email/email.service';
import { NotificationRealtimeService } from '../notifications/notification-realtime.service';
import {
  InterviewListQueryDto,
  ScheduleInterviewDto,
  UpdateInterviewDto,
} from './interview.dto';

@Injectable()
export class InterviewService {
  constructor(
    private readonly database: DataSource,
    private readonly companies: CompanyService,
    private readonly email: EmailService,
    private readonly realtimeNotifications: NotificationRealtimeService,
    @InjectRepository(Interview)
    private readonly interviews: Repository<Interview>,
  ) {}

  async schedule(user: User, applicationId: string, dto: ScheduleInterviewDto) {
    const company = await this.companies.ensureOwnProfile(user);
    const scheduledAt = this.futureDate(dto.scheduledAt);
    this.validateDetails(dto.type, dto.location, dto.meetingUrl);

    const result = await this.database.transaction(async (manager) => {
      const application = await manager
        .getRepository(Application)
        .createQueryBuilder('application')
        .innerJoinAndSelect('application.job', 'job')
        .innerJoinAndSelect('application.user', 'user')
        .where('application.id = :applicationId', { applicationId })
        .andWhere('job.companyId = :companyId', { companyId: company.id })
        .setLock('pessimistic_write')
        .getOne();
      if (!application)
        throw new NotFoundException('Application was not found.');
      if (
        [
          ApplicationStatus.WITHDRAWN,
          ApplicationStatus.REJECTED,
          ApplicationStatus.HIRED,
        ].includes(application.status)
      ) {
        throw new ConflictException(
          'An interview cannot be scheduled for a finalized application.',
        );
      }

      if (
        [
          ApplicationStatus.APPLIED,
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.SHORTLISTED,
        ].includes(application.status)
      ) {
        application.status = ApplicationStatus.INTERVIEW;
        application.history = [
          ...(application.history ?? []),
          {
            status: ApplicationStatus.INTERVIEW,
            at: new Date().toISOString(),
            changedBy: 'COMPANY',
          },
        ];
        await manager.save(application);
      }

      const created = manager.create(Interview, {
        applicationId: application.id,
        application,
        createdByUserId: user.id,
        scheduledAt,
        type: dto.type,
        location: dto.location?.trim() || null,
        meetingUrl: dto.meetingUrl?.trim() || null,
        notes: dto.notes?.trim() ?? '',
        status: InterviewStatus.SCHEDULED,
        cancelledAt: null,
      });
      const saved = await manager.save(created);
      const notification = await this.notifyCandidate(
        manager,
        application,
        'Interview scheduled',
        `An interview for ${application.job.title} is scheduled for ${scheduledAt.toISOString()}.`,
      );
      return { interview: { ...saved, application }, notification };
    });
    this.realtimeNotifications.publish(result.notification);
    await this.email.sendActivityEmail(
      result.interview.application.user.email,
      'INTERVIEW_SCHEDULED',
      `/applications/${result.interview.applicationId}?tab=interviews`,
    );
    return { interview: this.present(result.interview) };
  }

  async listForCompany(user: User, query: InterviewListQueryDto) {
    const company = await this.companies.ensureOwnProfile(user);
    const [interviews, total] = await this.interviews
      .createQueryBuilder('interview')
      .innerJoinAndSelect('interview.application', 'application')
      .innerJoinAndSelect('application.job', 'job')
      .where('job.companyId = :companyId', { companyId: company.id })
      .orderBy('interview.scheduledAt', 'ASC')
      .addOrderBy('interview.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      interviews: interviews.map((interview) => this.present(interview)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async listForCandidate(user: User, query: InterviewListQueryDto) {
    const [interviews, total] = await this.interviews
      .createQueryBuilder('interview')
      .innerJoinAndSelect('interview.application', 'application')
      .innerJoinAndSelect('application.job', 'job')
      .where('application.userId = :userId', { userId: user.id })
      .orderBy('interview.scheduledAt', 'ASC')
      .addOrderBy('interview.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      interviews: interviews.map((interview) => this.present(interview)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async update(user: User, id: string, dto: UpdateInterviewDto) {
    const company = await this.companies.ensureOwnProfile(user);
    if (!Object.values(dto).some((value) => value !== undefined)) {
      throw new BadRequestException(
        'Provide at least one interview field to update.',
      );
    }
    const result = await this.database.transaction(async (manager) => {
      const current = await this.companyInterviewForUpdate(
        manager,
        company.id,
        id,
      );
      if (!current) throw new NotFoundException('Interview was not found.');
      if (current.status !== InterviewStatus.SCHEDULED) {
        throw new ConflictException('A cancelled interview cannot be updated.');
      }

      if (dto.scheduledAt !== undefined) {
        current.scheduledAt = this.futureDate(dto.scheduledAt);
      }
      if (dto.type !== undefined) current.type = dto.type;
      if (dto.location !== undefined)
        current.location = dto.location?.trim() || null;
      if (dto.meetingUrl !== undefined)
        current.meetingUrl = dto.meetingUrl?.trim() || null;
      if (dto.notes !== undefined) current.notes = dto.notes.trim();
      this.validateDetails(current.type, current.location, current.meetingUrl);

      const saved = await manager.save(current);
      const notification = await this.notifyCandidate(
        manager,
        current.application,
        'Interview updated',
        `The interview for ${current.application.job.title} has been updated.`,
      );
      return { interview: saved, notification };
    });
    this.realtimeNotifications.publish(result.notification);
    await this.email.sendActivityEmail(
      result.interview.application.user.email,
      'INTERVIEW_UPDATED',
      `/applications/${result.interview.applicationId}?tab=interviews`,
    );
    return { interview: this.present(result.interview) };
  }

  async cancel(user: User, id: string) {
    const company = await this.companies.ensureOwnProfile(user);
    const result = await this.database.transaction(async (manager) => {
      const current = await this.companyInterviewForUpdate(
        manager,
        company.id,
        id,
      );
      if (!current) throw new NotFoundException('Interview was not found.');
      if (current.status === InterviewStatus.CANCELLED)
        return { interview: current, changed: false, notification: null };

      current.status = InterviewStatus.CANCELLED;
      current.cancelledAt = new Date();
      const saved = await manager.save(current);
      const notification = await this.notifyCandidate(
        manager,
        current.application,
        'Interview cancelled',
        `The interview for ${current.application.job.title} has been cancelled.`,
      );
      return { interview: saved, changed: true, notification };
    });
    if (result.notification)
      this.realtimeNotifications.publish(result.notification);
    if (result.changed) {
      await this.email.sendActivityEmail(
        result.interview.application.user.email,
        'INTERVIEW_CANCELLED',
        `/applications/${result.interview.applicationId}?tab=interviews`,
      );
    }
    return { interview: this.present(result.interview) };
  }

  private async companyInterviewForUpdate(
    manager: EntityManager,
    companyId: string,
    id: string,
  ) {
    return manager
      .getRepository(Interview)
      .createQueryBuilder('interview')
      .innerJoinAndSelect('interview.application', 'application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('application.user', 'user')
      .where('interview.id = :id', { id })
      .andWhere('job.companyId = :companyId', { companyId })
      .setLock('pessimistic_write')
      .getOne();
  }

  private async notifyCandidate(
    manager: EntityManager,
    application: Application,
    title: string,
    message: string,
  ) {
    return manager.save(
      Notification,
      manager.create(Notification, {
        userId: application.userId,
        title,
        message,
        link: '/interviews/me',
        readAt: null,
      }),
    );
  }

  private futureDate(value: string) {
    const date = new Date(value);
    if (
      !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ||
      Number.isNaN(date.getTime()) ||
      date.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'Interview time must be a future ISO date with an explicit timezone.',
      );
    }
    return date;
  }

  private validateDetails(
    type: InterviewType,
    location?: string | null,
    meetingUrl?: string | null,
  ) {
    if (type === InterviewType.ONSITE && !location?.trim()) {
      throw new BadRequestException(
        'An on-site interview requires a location.',
      );
    }
    if (type === InterviewType.ONLINE && !meetingUrl?.trim()) {
      throw new BadRequestException(
        'An online interview requires a meeting URL.',
      );
    }
    if (meetingUrl) {
      try {
        const url = new URL(meetingUrl);
        if (url.protocol !== 'https:' || url.username || url.password) {
          throw new Error('Unsafe meeting URL');
        }
      } catch {
        throw new BadRequestException(
          'Meeting URLs must use HTTPS and cannot contain credentials.',
        );
      }
    }
  }

  private present(interview: Interview) {
    const candidate = interview.application.candidate ?? {};
    return {
      id: interview.id,
      applicationId: interview.applicationId,
      job: {
        id: interview.application.job.id,
        title: interview.application.job.title,
        company: interview.application.job.company,
      },
      candidate: {
        firstName: candidate.firstName ?? '',
        lastName: candidate.lastName ?? '',
      },
      scheduledAt: interview.scheduledAt,
      type: interview.type,
      location: interview.location,
      meetingUrl: interview.meetingUrl,
      notes: interview.notes,
      status: interview.status,
      cancelledAt: interview.cancelledAt,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };
  }
}
