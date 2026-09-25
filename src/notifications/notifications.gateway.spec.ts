import type { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { SessionGuard } from '../auth/session.guard';
import { NotificationRealtimeService } from './notification-realtime.service';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway', () => {
  const authenticatedUserId = '11111111-1111-4111-8111-111111111111';

  function setup() {
    const sessions = { authenticateToken: jest.fn() };
    const notifications = { connect: jest.fn(), disconnect: jest.fn() };
    const config = {
      get: jest.fn().mockReturnValue('http://localhost:5173'),
    };
    const gateway = new NotificationsGateway(
      sessions as unknown as SessionGuard,
      notifications as unknown as NotificationRealtimeService,
      config as unknown as ConfigService,
    );
    let middleware:
      ((client: Socket, next: (error?: Error) => void) => void) | undefined;
    const fakeServer = {
      use: (
        handler: (client: Socket, next: (error?: Error) => void) => void,
      ) => {
        middleware = handler;
      },
    };
    gateway.afterInit(fakeServer as unknown as Server);
    return { sessions, notifications, gateway, middleware: middleware! };
  }

  it('rejects a missing credential before a socket is connected', async () => {
    const { sessions, middleware } = setup();
    const client = {
      handshake: { auth: {}, headers: {} },
      data: {},
    } as unknown as Socket;
    const error = await new Promise<Error | undefined>((resolve) =>
      middleware(client, resolve),
    );

    expect(error).toBeInstanceOf(Error);
    expect(sessions.authenticateToken).not.toHaveBeenCalled();
  });

  it('rejects origins that are not configured for the frontend', async () => {
    const { sessions, middleware } = setup();
    const client = {
      handshake: {
        auth: { token: 'verified-jwt' },
        headers: { origin: 'https://untrusted.example' },
      },
      data: {},
    } as unknown as Socket;
    const error = await new Promise<Error | undefined>((resolve) =>
      middleware(client, resolve),
    );

    expect(error).toBeInstanceOf(Error);
    expect(sessions.authenticateToken).not.toHaveBeenCalled();
  });

  it('binds the server-verified account, ignoring a client-selected user ID', async () => {
    const { sessions, notifications, gateway, middleware } = setup();
    sessions.authenticateToken.mockResolvedValue({ id: authenticatedUserId });
    const client = {
      handshake: {
        auth: {
          token: 'verified-jwt',
          userId: '22222222-2222-4222-8222-222222222222',
        },
        headers: {},
      },
      data: {},
    } as unknown as Socket;

    const error = await new Promise<Error | undefined>((resolve) =>
      middleware(client, resolve),
    );
    gateway.handleConnection(client);

    expect(error).toBeUndefined();
    expect(sessions.authenticateToken).toHaveBeenCalledWith('verified-jwt');
    expect(notifications.connect).toHaveBeenCalledWith(
      authenticatedUserId,
      client,
    );
    gateway.handleDisconnect(client);
  });

  it('rejects a signed-in token that the shared session guard no longer accepts', async () => {
    const { sessions, middleware } = setup();
    sessions.authenticateToken.mockRejectedValue(new Error('Session revoked'));
    const client = {
      handshake: { auth: { token: 'revoked-jwt' }, headers: {} },
      data: {},
    } as unknown as Socket;

    const error = await new Promise<Error | undefined>((resolve) =>
      middleware(client, resolve),
    );

    expect(error).toBeInstanceOf(Error);
  });

  it('closes an established socket when its session is later revoked', async () => {
    jest.useFakeTimers();
    const { sessions, gateway } = setup();
    sessions.authenticateToken.mockRejectedValue(new Error('Session revoked'));
    const disconnect = jest.fn();
    const client = {
      handshake: { auth: { token: 'revoked-after-connect' }, headers: {} },
      data: { authenticatedUserId },
      disconnect,
    } as unknown as Socket;
    gateway.handleConnection(client);

    await jest.advanceTimersByTimeAsync(60_000);

    expect(sessions.authenticateToken).toHaveBeenCalledWith(
      'revoked-after-connect',
    );
    expect(disconnect).toHaveBeenCalledWith(true);
    gateway.handleDisconnect(client);
    jest.useRealTimers();
  });
});
