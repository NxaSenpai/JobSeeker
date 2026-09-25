import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import type { Server, Socket } from 'socket.io';
import { SessionGuard } from '../auth/session.guard';
import { NotificationRealtimeService } from './notification-realtime.service';
import type { NotificationSocket } from './notification-socket.type';

const SESSION_REVALIDATION_INTERVAL_MS = 60_000;

@WebSocketGateway({
  namespace: '/notifications',
  transports: ['websocket'],
  cors: {
    origin: (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: false,
  },
  maxHttpBufferSize: 16 * 1024,
  perMessageDeflate: false,
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly revalidationTimers = new WeakMap<Socket, NodeJS.Timeout>();

  constructor(
    private readonly sessions: SessionGuard,
    private readonly notifications: NotificationRealtimeService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server) {
    server.use((client, next) => {
      const socket = client as NotificationSocket;
      const allowedOrigins = (
        this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
      )
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
      const origin = socket.handshake.headers.origin;
      if (origin && !allowedOrigins.includes(origin)) {
        next(new Error('Unauthorized.'));
        return;
      }

      const token: unknown = socket.handshake.auth?.token;
      if (typeof token !== 'string' || token.length > 4096) {
        next(new Error('Unauthorized.'));
        return;
      }

      void this.sessions
        .authenticateToken(token)
        .then((user) => {
          // The authenticated database identity is authoritative; ignore any
          // user ID or role supplied in the client's handshake payload.
          socket.data.authenticatedUserId = user.id;
          next();
        })
        .catch(() => next(new Error('Unauthorized.')));
    });
  }

  handleConnection(client: Socket) {
    const socket = client as NotificationSocket;
    const userId = socket.data.authenticatedUserId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }
    this.notifications.connect(userId, socket);

    const token: unknown = socket.handshake.auth?.token;
    if (typeof token !== 'string') {
      socket.disconnect(true);
      return;
    }
    const timer = setInterval(() => {
      void this.sessions
        .authenticateToken(token)
        .then((currentUser) => {
          if (currentUser.id !== userId) socket.disconnect(true);
        })
        .catch(() => socket.disconnect(true));
    }, SESSION_REVALIDATION_INTERVAL_MS);
    this.revalidationTimers.set(client, timer);
  }

  handleDisconnect(client: Socket) {
    const timer = this.revalidationTimers.get(client);
    if (timer) clearInterval(timer);
    this.revalidationTimers.delete(client);
    this.notifications.disconnect(client as NotificationSocket);
  }
}
