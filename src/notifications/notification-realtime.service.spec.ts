import { UserRole } from '../users/entities/user.entity';
import type { NotificationSocket } from './notification-socket.type';
import {
  ADMIN_QUEUES_UPDATED_EVENT,
  NotificationRealtimeService,
} from './notification-realtime.service';

describe('NotificationRealtimeService admin queue events', () => {
  it('publishes queue invalidations only to sockets authenticated as admins', () => {
    const service = new NotificationRealtimeService();
    const adminEmit = jest.fn(() => undefined);
    const candidateEmit = jest.fn(() => undefined);
    const adminSocket = {
      connected: true,
      data: {},
      emit: adminEmit,
    } as unknown as NotificationSocket;
    const candidateSocket = {
      connected: true,
      data: {},
      emit: candidateEmit,
    } as unknown as NotificationSocket;

    service.connect('admin-user-id', UserRole.ADMIN, adminSocket);
    service.connect('candidate-user-id', UserRole.USER, candidateSocket);
    service.publishAdminQueueUpdated();

    expect(adminEmit).toHaveBeenCalledTimes(1);
    const [eventName, payload] = adminEmit.mock.calls[0] ?? [];
    expect(eventName).toBe(ADMIN_QUEUES_UPDATED_EVENT);
    expect(
      typeof (payload as { updatedAt?: unknown } | undefined)?.updatedAt,
    ).toBe('string');
    expect(candidateEmit).not.toHaveBeenCalled();
  });
});
