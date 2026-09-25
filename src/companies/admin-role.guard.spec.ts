import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';
import { AdminRoleGuard } from './admin-role.guard';

describe('AdminRoleGuard', () => {
  const guard = new AdminRoleGuard();
  const contextFor = (role: UserRole) => ({
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  });

  it('allows an admin role loaded by the session guard', () => {
    expect(guard.canActivate(contextFor(UserRole.ADMIN) as never)).toBe(true);
  });

  it('rejects a non-admin account', () => {
    expect(() => guard.canActivate(contextFor(UserRole.USER) as never)).toThrow(
      ForbiddenException,
    );
  });
});
