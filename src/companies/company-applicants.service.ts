import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Application,
  ApplicationStatus,
} from '../account/entities/application.entity';
import { ApplicationNote } from '../account/entities/application-note.entity';
import { Notification } from '../account/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { CompanyService } from './company.service';
import { EmailService } from '../email/email.service';
import { NotificationRealtimeService } from '../notifications/notification-realtime.service';
import {
  CompanyApplicantQueryDto,
  CreateApplicationNoteDto,
  UpdateCompanyApplicationStatusDto,
} from './company-applicants.dto';

const employerTransitions: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  [ApplicationStatus.APPLIED]: [
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.OFFERED,
    ApplicationStatus.HIRED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.OFFERED,
    ApplicationStatus.HIRED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.SHORTLISTED]: [
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.OFFERED,
    ApplicationStatus.HIRED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.INTERVIEW]: [
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.OFFERED,
    ApplicationStatus.HIRED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.OFFERED]: [
    ApplicationStatus.HIRED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.HIRED]: [],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

type CandidateSnapshot = {
  firstName?: unknown;
  lastName?: unknown;
  headline?: unknown;
  bio?: unknown;
  location?: unknown;
  websiteUrl?: unknown;
  linkedinUrl?: unknown;
  githubUrl?: unknown;
  email?: unknown;
  skills?: unknown;
  education?: unknown;
  experience?: unknown;
  languages?: unknown;
};

@Injectable()
export class CompanyApplicantsService {
  constructor(
    private readonly database: DataSource,
    private readonly companies: CompanyService,
    private readonly email: EmailService,
    private readonly realtimeNotifications: NotificationRealtimeService,
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    @InjectRepository(ApplicationNote)
    private readonly notes: Repository<ApplicationNote>,
  ) {}

  async list(user: User, query: CompanyApplicantQueryDto) {
    const company = await this.companies.ensureOwnProfile(user);
    const builder = this.applications
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .where('job.companyId = :companyId', { companyId: company.id });

    if (query.jobId) {
      builder.andWhere('application.jobId = :jobId', { jobId: query.jobId });
    }
    if (query.status) {
      builder.andWhere('application.status = :status', {
        status: query.status,
      });
    }
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      builder.andWhere(
        `(
          job.title ILIKE :search OR
          application.candidate ->> 'firstName' ILIKE :search OR
          application.candidate ->> 'lastName' ILIKE :search OR
          application.candidate ->> 'headline' ILIKE :search OR
          application.candidate ->> 'location' ILIKE :search OR
          application.candidate ->> 'email' ILIKE :search OR
          application.description ILIKE :search OR
          (application.candidate -> 'skills')::text ILIKE :search OR
          (application.candidate -> 'experience')::text ILIKE :search
        )`,
        { search },
      );
    }
    if (query.skill?.trim()) {
      builder.andWhere(
        `(application.candidate -> 'skills')::text ILIKE :skill`,
        { skill: `%${query.skill.trim()}%` },
      );
    }

    const [applications, total] = await builder
      .orderBy('application.createdAt', 'DESC')
      .addOrderBy('application.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      applications: applications.map((application) =>
        this.presentListItem(application),
      ),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async listForJob(user: User, jobId: string, query: CompanyApplicantQueryDto) {
    return this.list(user, { ...query, jobId });
  }

  async get(user: User, id: string) {
    const company = await this.companies.ensureOwnProfile(user);
    const application = await this.ownedApplication(company.id, id);
    return { application: this.presentDetails(application) };
  }

  async updateStatus(
    user: User,
    id: string,
    dto: UpdateCompanyApplicationStatusDto,
  ) {
    const company = await this.companies.ensureOwnProfile(user);
    if (
      dto.status === ApplicationStatus.APPLIED ||
      dto.status === ApplicationStatus.WITHDRAWN
    ) {
      throw new BadRequestException(
        'Companies cannot set an application to APPLIED or WITHDRAWN.',
      );
    }

    const result = await this.database.transaction(async (manager) => {
      const current = await manager
        .getRepository(Application)
        .createQueryBuilder('application')
        .innerJoinAndSelect('application.job', 'job')
        .innerJoinAndSelect('application.resume', 'resume')
        .innerJoinAndSelect('application.user', 'user')
        .where('application.id = :id', { id })
        .andWhere('job.companyId = :companyId', { companyId: company.id })
        .setLock('pessimistic_write')
        .getOne();

      if (!current) throw new NotFoundException('Application was not found.');
      if (current.status === dto.status)
        return { application: current, changed: false, notification: null };
      if (!employerTransitions[current.status]?.includes(dto.status)) {
        throw new ConflictException(
          `An application in ${current.status} cannot be changed to ${dto.status}.`,
        );
      }

      const changedAt = new Date();
      current.status = dto.status;
      current.history = [
        ...(current.history ?? []),
        {
          status: dto.status,
          at: changedAt.toISOString(),
          changedBy: 'COMPANY',
        },
      ];
      await manager.save(current);
      const notification = await manager.save(
        Notification,
        manager.create(Notification, {
          userId: current.userId,
          title: 'Application status updated',
          message: `Your application for ${current.job.title} is now ${dto.status.replaceAll('_', ' ').toLowerCase()}.`,
          link: `/applications/${current.id}`,
          readAt: null,
        }),
      );
      return { application: current, changed: true, notification };
    });

    if (result.changed) {
      if (result.notification)
        this.realtimeNotifications.publish(result.notification);
      await this.email.sendActivityEmail(
        result.application.user.email,
        'APPLICATION_STATUS',
        `/applications/${id}`,
      );
    }
    return { application: this.presentDetails(result.application) };
  }

  async listNotes(user: User, applicationId: string) {
    const company = await this.companies.ensureOwnProfile(user);
    await this.ownedApplication(company.id, applicationId);
    const notes = await this.notes.find({
      where: { applicationId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return { notes: notes.map((note) => this.presentNote(note)) };
  }

  async addNote(
    user: User,
    applicationId: string,
    dto: CreateApplicationNoteDto,
  ) {
    const company = await this.companies.ensureOwnProfile(user);
    await this.ownedApplication(company.id, applicationId);
    const note = await this.notes.save(
      this.notes.create({
        applicationId,
        authorUserId: user.id,
        body: dto.body.trim(),
      }),
    );
    return { note: this.presentNote(note) };
  }

  async deleteNote(user: User, applicationId: string, noteId: string) {
    const company = await this.companies.ensureOwnProfile(user);
    await this.ownedApplication(company.id, applicationId);
    const result = await this.notes.delete({ id: noteId, applicationId });
    if (!result.affected) throw new NotFoundException('Note was not found.');
    return { deleted: true };
  }

  private async ownedApplication(companyId: string, id: string) {
    const application = await this.applications
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('application.resume', 'resume')
      .where('application.id = :id', { id })
      .andWhere('job.companyId = :companyId', { companyId })
      .getOne();
    if (!application) throw new NotFoundException('Application was not found.');
    return application;
  }

  private presentListItem(application: Application) {
    const candidate = (application.candidate ?? {}) as CandidateSnapshot;
    return {
      id: application.id,
      job: {
        id: application.job.id,
        title: application.job.title,
        company: application.job.company,
        location: application.job.location,
      },
      candidate: {
        firstName: candidate.firstName ?? '',
        lastName: candidate.lastName ?? '',
        headline: candidate.headline ?? '',
        location: candidate.location ?? '',
        skills: Array.isArray(candidate.skills) ? candidate.skills : [],
      },
      status: application.status,
      appliedAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  private presentDetails(application: Application) {
    const snapshot = (application.candidate ?? {}) as CandidateSnapshot;
    const candidate: Record<string, unknown> = {};
    for (const key of [
      'firstName',
      'lastName',
      'headline',
      'bio',
      'location',
      'websiteUrl',
      'linkedinUrl',
      'githubUrl',
      'skills',
      'education',
      'experience',
      'languages',
    ] as const) {
      const value = snapshot[key];
      if (value !== undefined) candidate[key] = value;
    }

    return {
      id: application.id,
      job: {
        id: application.job.id,
        title: application.job.title,
        company: application.job.company,
        location: application.job.location,
      },
      candidate,
      contact: {
        email: typeof snapshot.email === 'string' ? snapshot.email : null,
        phone: application.phone || null,
      },
      description: application.description,
      coverLetter: application.coverLetter,
      portfolioUrl: application.portfolioUrl || null,
      resume: {
        id: application.resume.id,
        fileName: application.resume.fileName,
        mimeType: application.resume.mimeType,
        fileSize: application.resume.fileSize,
        downloadUrl: `/api/v1/company/applications/${application.id}/resume`,
      },
      status: application.status,
      history: (application.history ?? []).map((entry) => ({
        status: entry.status,
        at: entry.at,
        ...(entry.changedBy ? { changedBy: entry.changedBy } : {}),
      })),
      appliedAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  private presentNote(note: ApplicationNote) {
    return {
      id: note.id,
      body: note.body,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }
}
