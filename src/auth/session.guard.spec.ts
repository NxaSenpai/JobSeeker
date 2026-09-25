import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from './session.guard';

describe('SessionGuard', () => {
  it('rejects an account suspended after its access token was issued', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    };
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: userId,
        emailVerified: true,
        suspendedAt: new Date(),
      }),
    };
    const request = { headers: { authorization: 'Bearer valid-token' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const guard = new SessionGuard(jwt as never, users as never);

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(users.findOne).toHaveBeenCalledWith({ where: { id: userId } });
  });

  it('rejects an old token after an account has been unsuspended', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        sessionVersion: 2,
      }),
    };
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: userId,
        emailVerified: true,
        suspendedAt: null,
        sessionVersion: 3,
      }),
    };
    const request = { headers: { authorization: 'Bearer old-token' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const guard = new SessionGuard(jwt as never, users as never);

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
