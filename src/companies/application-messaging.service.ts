import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { NotificationRealtimeService } from '../notifications/notification-realtime.service';
import { Application } from '../account/entities/application.entity';
import { ApplicationMessage } from '../account/entities/application-message.entity';
import { Notification } from '../account/entities/notification.entity';
import { Company } from '../account/entities/company.entity';
import { User } from '../users/entities/user.entity';
import { CompanyService } from './company.service';
import {
  ApplicationMessageQueryDto,
  SendApplicationMessageDto,
} from './application-message.dto';

const MAX_MESSAGES_PER_HOUR_PER_APPLICATION = 30;

@Injectable()
export class ApplicationMessagingService {
  constructor(
    private readonly database: DataSource,
    private readonly companies: CompanyService,
    private readonly email: EmailService,
    private readonly realtimeNotifications: NotificationRealtimeService,
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    @InjectRepository(ApplicationMessage)
    private readonly messages: Repository<ApplicationMessage>,
  ) {}

  async listForCompany(
    user: User,
    applicationId: string,
    query: ApplicationMessageQueryDto,
  ) {
    const company = await this.companies.ensureOwnProfile(user);
    const application = await this.companyApplication(
      this.applications,
      company.id,
      applicationId,
    );
    return this.listThread(application, query, user.id);
  }

  async listForCandidate(
    user: User,
    applicationId: string,
    query: ApplicationMessageQueryDto,
  ) {
    const application = await this.candidateApplication(
      this.applications,
      user.id,
      applicationId,
    );
    this.assertRealCompanyApplication(application);
    await this.companiesFor(application.job.companyId);
    return this.listThread(application, query, user.id);
  }

  async sendFromCompany(
    user: User,
    applicationId: string,
    dto: SendApplicationMessageDto,
  ) {
    const company = await this.companies.ensureOwnProfile(user);
    const body = this.cleanBody(dto.body);
    const sent = await this.database.transaction(async (manager) => {
      const application = await this.lockCompanyApplication(
        manager,
        company.id,
        applicationId,
      );
      const recipient = await manager.findOneBy(User, {
        id: application.userId,
      });
      if (!recipient) throw new NotFoundException('Application was not found.');
      await this.enforceMessageRateLimit(manager, application.id, user.id);
      const message = await manager.save(
        ApplicationMessage,
        manager.create(ApplicationMessage, {
          applicationId: application.id,
          senderUserId: user.id,
          recipientUserId: recipient.id,
          body,
          readAt: null,
        }),
      );
      const notification = await manager.save(
        Notification,
        manager.create(Notification, {
          userId: recipient.id,
          title: 'New message about your application',
          message: 'The company sent you a message about your application.',
          link: `/applications/${application.id}?tab=messages`,
          readAt: null,
        }),
      );
      return { message, recipientEmail: recipient.email, notification };
    });

    this.realtimeNotifications.publish(sent.notification);
    await this.email.sendActivityEmail(
      sent.recipientEmail,
      'APPLICATION_MESSAGE',
      `/applications/${applicationId}?tab=messages`,
    );
    return { message: this.presentMessage(sent.message, 'COMPANY') };
  }

  async sendFromCandidate(
    user: User,
    applicationId: string,
    dto: SendApplicationMessageDto,
  ) {
    const body = this.cleanBody(dto.body);
    const sent = await this.database.transaction(async (manager) => {
      const application = await this.lockCandidateApplication(
        manager,
        user.id,
        applicationId,
      );
      this.assertRealCompanyApplication(application);
      const companyId = application.job.companyId;
      if (!companyId) {
        throw new ConflictException(
          'Sample applications cannot send messages.',
        );
      }
      const company = await manager.findOneBy(Company, {
        id: companyId,
      });
      if (!company?.ownerUserId) {
        throw new ConflictException(
          'This application is not linked to a company account that can receive messages.',
        );
      }
      const recipient = await manager.findOneBy(User, {
        id: company.ownerUserId,
      });
      if (!recipient) throw new NotFoundException('Application was not found.');
      await this.enforceMessageRateLimit(manager, application.id, user.id);
      const message = await manager.save(
        ApplicationMessage,
        manager.create(ApplicationMessage, {
          applicationId: application.id,
          senderUserId: user.id,
          recipientUserId: recipient.id,
          body,
          readAt: null,
        }),
      );
      return { message, recipientEmail: recipient.email };
    });

    await this.email.sendActivityEmail(
      sent.recipientEmail,
      'APPLICATION_MESSAGE',
      `/company/applications/${applicationId}?tab=messages`,
    );
    return { message: this.presentMessage(sent.message, 'CANDIDATE') };
  }

  async markCompanyThreadRead(user: User, applicationId: string) {
    const company = await this.companies.ensureOwnProfile(user);
    await this.companyApplication(this.applications, company.id, applicationId);
    await this.messages.update(
      {
        applicationId,
        recipientUserId: user.id,
        readAt: IsNull(),
      },
      { readAt: new Date() },
    );
    return { updated: true };
  }

  async markCandidateThreadRead(user: User, applicationId: string) {
    const application = await this.candidateApplication(
      this.applications,
      user.id,
      applicationId,
    );
    this.assertRealCompanyApplication(application);
    await this.messages.update(
      {
        applicationId,
        recipientUserId: user.id,
        readAt: IsNull(),
      },
      { readAt: new Date() },
    );
    return { updated: true };
  }

  private async listThread(
    application: Application,
    query: ApplicationMessageQueryDto,
    viewerUserId: string,
  ) {
    const [items, total] = await this.messages.findAndCount({
      where: { applicationId: application.id },
      order: { createdAt: 'ASC', id: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    const unreadCount = await this.messages.countBy({
      applicationId: application.id,
      recipientUserId: viewerUserId,
      readAt: IsNull(),
    });
    return {
      messages: items.map((item) =>
        this.presentMessage(
          item,
          item.senderUserId === application.userId ? 'CANDIDATE' : 'COMPANY',
        ),
      ),
      total,
      page: query.page,
      limit: query.limit,
      unreadCount,
    };
  }

  private async companyApplication(
    repository: Repository<Application>,
    companyId: string,
    applicationId: string,
  ) {
    const application = await repository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .where('application.id = :applicationId', { applicationId })
      .andWhere('job.companyId = :companyId', { companyId })
      .getOne();
    if (!application) throw new NotFoundException('Application was not found.');
    return application;
  }

  private async candidateApplication(
    repository: Repository<Application>,
    userId: string,
    applicationId: string,
  ) {
    const application = await repository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .where('application.id = :applicationId', { applicationId })
      .andWhere('application.userId = :userId', { userId })
      .getOne();
    if (!application) throw new NotFoundException('Application was not found.');
    return application;
  }

  private async lockCompanyApplication(
    manager: EntityManager,
    companyId: string,
    applicationId: string,
  ) {
    const application = await manager
      .getRepository(Application)
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .where('application.id = :applicationId', { applicationId })
      .andWhere('job.companyId = :companyId', { companyId })
      .setLock('pessimistic_write')
      .getOne();
    if (!application) throw new NotFoundException('Application was not found.');
    this.assertRealCompanyApplication(application);
    return application;
  }

  private async lockCandidateApplication(
    manager: EntityManager,
    userId: string,
    applicationId: string,
  ) {
    const application = await manager
      .getRepository(Application)
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .where('application.id = :applicationId', { applicationId })
      .andWhere('application.userId = :userId', { userId })
      .setLock('pessimistic_write')
      .getOne();
    if (!application) throw new NotFoundException('Application was not found.');
    return application;
  }

  private async enforceMessageRateLimit(
    manager: EntityManager,
    applicationId: string,
    senderUserId: string,
  ) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await manager
      .getRepository(ApplicationMessage)
      .createQueryBuilder('message')
      .where('message.applicationId = :applicationId', { applicationId })
      .andWhere('message.senderUserId = :senderUserId', { senderUserId })
      .andWhere('message.createdAt >= :since', { since })
      .getCount();
    if (count >= MAX_MESSAGES_PER_HOUR_PER_APPLICATION) {
      throw new HttpException(
        'Message limit reached for this application. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async companiesFor(companyId: string | null) {
    if (!companyId)
      throw new ConflictException('This is a sample application.');
    const company = await this.database.getRepository(Company).findOneBy({
      id: companyId,
    });
    if (!company) throw new NotFoundException('Application was not found.');
    if (company.isDemo || !company.ownerUserId) {
      throw new ConflictException(
        'This application is not linked to a company account that can receive messages.',
      );
    }
    return company;
  }

  private assertRealCompanyApplication(application: Application) {
    if (!application.job.companyId || application.job.isDemo) {
      throw new ConflictException('Sample applications cannot send messages.');
    }
  }

  private cleanBody(value: string) {
    const body = value.trim();
    if (!body || body.length > 5000) {
      throw new BadRequestException(
        'A message must contain between 1 and 5000 characters.',
      );
    }
    return body;
  }

  private presentMessage(
    message: ApplicationMessage,
    senderRole: 'CANDIDATE' | 'COMPANY',
  ) {
    return {
      id: message.id,
      body: message.body,
      senderRole,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }
}
