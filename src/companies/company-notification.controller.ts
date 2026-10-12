import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SessionGuard, type SessionRequest } from '../auth/session.guard';
import { ApplicationQueryDto } from '../account/application.dto';
import { Notification } from '../account/entities/notification.entity';
import { CompanyRoleGuard } from './company-role.guard';

@Controller('api/v1/company/notifications')
@UseGuards(SessionGuard, CompanyRoleGuard)
export class CompanyNotificationController {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  @Get()
  async list(
    @Req() request: SessionRequest,
    @Query() query: ApplicationQueryDto,
  ) {
    const [notifications, total] = await this.notifications.findAndCount({
      where: { userId: request.user.id },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { notifications: notifications.map((item) => this.present(item)), total };
  }

  @Get('unread-count')
  async count(@Req() request: SessionRequest) {
    return {
      count: await this.notifications.countBy({
        userId: request.user.id,
        readAt: IsNull(),
      }),
    };
  }

  @Patch('read-all')
  async readAll(@Req() request: SessionRequest) {
    await this.notifications.update(
      { userId: request.user.id, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: true };
  }

  @Patch(':id/read')
  async read(
    @Req() request: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const item = await this.notifications.findOneBy({
      id,
      userId: request.user.id,
    });
    if (!item) throw new NotFoundException('Notification was not found.');
    if (!item.readAt)
      await this.notifications.update(
        { id, userId: request.user.id },
        { readAt: new Date() },
      );
    return { updated: true };
  }

  private present(item: Notification) {
    return {
      id: item.id,
      title: item.title,
      message: item.message,
      link: item.link,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    };
  }
}
