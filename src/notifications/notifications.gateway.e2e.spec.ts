import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server as HttpServer } from 'node:http';
import { io, type Socket } from 'socket.io-client';
import { SessionGuard } from '../auth/session.guard';
import { Notification } from '../account/entities/notification.entity';
import {
  NOTIFICATION_CREATED_EVENT,
  NotificationRealtimeService,
} from './notification-realtime.service';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway WebSocket delivery', () => {
  const userA = '11111111-1111-4111-8111-111111111111';
  const userB = '22222222-2222-4222-8222-222222222222';
  let app: INestApplication;
  let socketUrl: string;
  let realtime: NotificationRealtimeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        NotificationRealtimeService,
        {
          provide: SessionGuard,
          useValue: {
            authenticateToken: jest.fn(
              (token: string): Promise<{ id: string }> => {
                if (token === 'user-a-token')
                  return Promise.resolve({ id: userA });
                if (token === 'user-b-token')
                  return Promise.resolve({ id: userB });
                return Promise.reject(new Error('Invalid token'));
              },
            ),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://127.0.0.1') },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    realtime = module.get(NotificationRealtimeService);
    await app.listen(0, '127.0.0.1');
    const httpServer = app.getHttpServer() as HttpServer;
    const address = httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('The notification test server did not bind a TCP port.');
    }
    socketUrl = `http://127.0.0.1:${address.port}/notifications`;
  });

  afterAll(async () => {
    await app?.close();
  });

  async function connect(token?: string, origin?: string) {
    return new Promise<Socket>((resolve, reject) => {
      const client = io(socketUrl, {
        auth: token ? { token } : {},
        transports: ['websocket'],
        reconnection: false,
        timeout: 2_000,
        ...(origin ? { extraHeaders: { Origin: origin } } : {}),
      });
      client.once('connect', () => resolve(client));
      client.once('connect_error', (error) => {
        client.close();
        reject(error);
      });
    });
  }

  it('rejects unauthenticated and disallowed-origin connections', async () => {
    await expect(connect()).rejects.toBeInstanceOf(Error);
    await expect(
      connect('user-a-token', 'https://untrusted.example'),
    ).rejects.toBeInstanceOf(Error);
  });

  it('delivers a committed notification to its recipient but not another account', async () => {
    const recipient = await connect('user-a-token');
    const otherUser = await connect('user-b-token');
    let otherUserReceived = false;
    otherUser.on(NOTIFICATION_CREATED_EVENT, () => {
      otherUserReceived = true;
    });
    const eventReceived = new Promise<unknown>((resolve) =>
      recipient.once(NOTIFICATION_CREATED_EVENT, resolve),
    );

    realtime.publish({
      id: 'notification-1',
      userId: userA,
      title: 'Application status updated',
      message: 'Your application is under review.',
      link: '/applications/application-1',
      readAt: null,
      createdAt: new Date('2026-09-24T10:00:00.000Z'),
    } as Notification);

    await expect(eventReceived).resolves.toEqual({
      id: 'notification-1',
      title: 'Application status updated',
      message: 'Your application is under review.',
      link: '/applications/application-1',
      readAt: null,
      createdAt: '2026-09-24T10:00:00.000Z',
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(otherUserReceived).toBe(false);
    recipient.disconnect();
    otherUser.disconnect();
  });
});
