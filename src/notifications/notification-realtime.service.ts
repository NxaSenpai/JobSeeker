import { Injectable } from '@nestjs/common';
import type { Notification } from '../account/entities/notification.entity';
import type { NotificationSocket } from './notification-socket.type';

export const NOTIFICATION_CREATED_EVENT = 'notification.created';

export type RealtimeNotification = {
  id: string;
  title: string;
  message: string;
  link: string;
  readAt: null;
  createdAt: string;
};

@Injectable()
export class NotificationRealtimeService {
  private readonly socketsByUser = new Map<string, Set<NotificationSocket>>();

  connect(userId: string, socket: NotificationSocket) {
    let sockets = this.socketsByUser.get(userId);
    if (!sockets) {
      sockets = new Set<NotificationSocket>();
      this.socketsByUser.set(userId, sockets);
    }
    sockets.add(socket);
    socket.data.authenticatedUserId = userId;
  }

  disconnect(socket: NotificationSocket) {
    const userId = socket.data.authenticatedUserId;
    if (!userId) return;

    const sockets = this.socketsByUser.get(userId);
    sockets?.delete(socket);
    if (sockets?.size === 0) this.socketsByUser.delete(userId);
    delete socket.data.authenticatedUserId;
  }

  publish(notification: Notification) {
    const sockets = this.socketsByUser.get(notification.userId);
    if (!sockets?.size) return;

    const payload: RealtimeNotification = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      readAt: null,
      createdAt: notification.createdAt.toISOString(),
    };

    for (const socket of sockets) {
      if (!socket.connected) {
        this.disconnect(socket);
        continue;
      }
      try {
        socket.emit(NOTIFICATION_CREATED_EVENT, payload);
      } catch {
        // A failed live send must not turn a committed REST operation into an
        // apparent failure; persisted notification history remains available.
        this.disconnect(socket);
      }
    }
  }
}
