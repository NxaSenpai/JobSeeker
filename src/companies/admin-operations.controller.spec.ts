import { UserRole } from '../users/entities/user.entity';
import type { SessionRequest } from '../auth/session.guard';
import { AdminOperationsController } from './admin-operations.controller';

describe('AdminOperationsController', () => {
  it('returns only minimal profile fields for the authenticated admin', () => {
    const controller = new AdminOperationsController({} as never);
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const updatedAt = new Date('2026-01-03T03:04:05.000Z');
    const request = {
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'admin@example.test',
        role: UserRole.ADMIN,
        emailVerified: true,
        firstName: 'Dara',
        lastName: 'Sok',
        createdAt,
        updatedAt,
        passwordHash: 'never-return-this',
        sessionVersion: 3,
        suspensionReason: 'internal detail',
      },
    } as unknown as SessionRequest;

    expect(controller.profile(request)).toEqual({
      profile: {
        id: request.user.id,
        email: request.user.email,
        role: UserRole.ADMIN,
        emailVerified: true,
        firstName: 'Dara',
        lastName: 'Sok',
        createdAt,
        updatedAt,
      },
    });
  });
});
