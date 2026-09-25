import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';
import { CompanyRoleGuard } from './company-role.guard';

describe('CompanyRoleGuard', () => {
  const user = { id: 'company-owner-id', role: UserRole.COMPANY };
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  };

  it('blocks employer routes when the company has been suspended', async () => {
    const companies = {
      findOneBy: jest.fn().mockResolvedValue({
        suspendedAt: new Date(),
      }),
    };
    const guard = new CompanyRoleGuard(companies as never);

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows an active company account', async () => {
    const companies = {
      findOneBy: jest.fn().mockResolvedValue({ suspendedAt: null }),
    };
    const guard = new CompanyRoleGuard(companies as never);

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(companies.findOneBy).toHaveBeenCalledWith({
      ownerUserId: user.id,
    });
  });
});
