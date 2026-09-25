import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationRealtimeService } from './notification-realtime.service';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [AuthModule],
  providers: [NotificationRealtimeService, NotificationsGateway],
  exports: [NotificationRealtimeService],
})
export class NotificationsModule {}
