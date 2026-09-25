import { Notification } from '../account/entities/notification.entity';
import type { NotificationSocket } from './notification-socket.type';
import {
  NOTIFICATION_CREATED_EVENT,
  NotificationRealtimeService,
} from './notification-realtime.service';

describe('NotificationRealtimeService', () => {
  const userA = '11111111-1111-4111-8111-111111111111';
  const userB = '22222222-2222-4222-8222-222222222222';

  function socket() {
    const emit = jest.fn();
    const client = {
      connected: true,
      data: {},
      emit,
    } as unknown as NotificationSocket;
    return { client, emit };
  }

  it('sends a minimized event only to sockets authenticated as the recipient', () => {
    const service = new NotificationRealtimeService();
    const recipientSocket = socket();
    const otherUserSocket = socket();
    service.connect(userA, recipientSocket.client);
    service.connect(userB, otherUserSocket.client);
    const createdAt = new Date('2026-09-24T10:00:00.000Z');

    service.publish({
      id: 'notification-1',
      userId: userA,
      title: 'Application status updated',
      message: 'Your application is under review.',
      link: '/applications/application-1',
      readAt: null,
      createdAt,
    } as Notification);

    expect(recipientSocket.emit).toHaveBeenCalledWith(
      NOTIFICATION_CREATED_EVENT,
      {
        id: 'notification-1',
        title: 'Application status updated',
        message: 'Your application is under review.',
        link: '/applications/application-1',
        readAt: null,
        createdAt: '2026-09-24T10:00:00.000Z',
      },
    );
    expect(otherUserSocket.emit).not.toHaveBeenCalled();
  });

  it('stops delivering to a socket after disconnect', () => {
    const service = new NotificationRealtimeService();
    const recipientSocket = socket();
    service.connect(userA, recipientSocket.client);
    service.disconnect(recipientSocket.client);

    service.publish({ userId: userA } as Notification);

    expect(recipientSocket.emit).not.toHaveBeenCalled();
  });

  it('keeps persisted notification workflows successful when a socket send fails', () => {
    const service = new NotificationRealtimeService();
    const brokenSocket = socket();
    brokenSocket.client.emit = jest.fn(() => {
      throw new Error('Socket transport closed unexpectedly');
    });
    service.connect(userA, brokenSocket.client);

    expect(() =>
      service.publish({
        id: 'notification-2',
        userId: userA,
        title: 'Application update',
        message: 'Your application changed.',
        link: '/applications/application-2',
        readAt: null,
        createdAt: new Date('2026-09-24T10:00:00.000Z'),
      } as Notification),
    ).not.toThrow();
  });
});
