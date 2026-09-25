import {
  Controller,
  Delete,
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
import { ApplicationQueryDto } from './application.dto';
import { Notification } from './entities/notification.entity';
import { JobSeekerGuard } from './job-seeker.guard';

@Controller('api/v1/notifications')
@UseGuards(SessionGuard, JobSeekerGuard)
export class NotificationController {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}
  @Get() async list(
    @Req() req: SessionRequest,
    @Query() query: ApplicationQueryDto,
  ) {
    const [notifications, total] = await this.notifications.findAndCount({
      where: { userId: req.user.id },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { notifications, total };
  }
  @Get('unread-count') async count(@Req() req: SessionRequest) {
    return {
      count: await this.notifications.countBy({
        userId: req.user.id,
        readAt: IsNull(),
      }),
    };
  }
  @Patch('read-all') async readAll(@Req() req: SessionRequest) {
    await this.notifications.update(
      { userId: req.user.id, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: true };
  }
  @Patch(':id/read') async read(
    @Req() req: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const item = await this.notifications.findOneBy({
      id,
      userId: req.user.id,
    });
    if (!item) throw new NotFoundException('Notification was not found.');
    if (!item.readAt)
      await this.notifications.update(
        { id, userId: req.user.id },
        { readAt: new Date() },
      );
    return { updated: true };
  }
  @Delete(':id') async remove(
    @Req() req: SessionRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notifications.delete({ id, userId: req.user.id });
    return { removed: true };
  }
}
