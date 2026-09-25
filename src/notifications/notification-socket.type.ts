import type { DefaultEventsMap, Socket } from 'socket.io';

export type NotificationSocketData = {
  authenticatedUserId?: string;
};

export type NotificationSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  NotificationSocketData
>;
