import type { DefaultEventsMap, Socket } from 'socket.io';
import type { UserRole } from '../users/entities/user.entity';

export type NotificationSocketData = {
  authenticatedUserId?: string;
  authenticatedRole?: UserRole;
};

export type NotificationSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  NotificationSocketData
>;
