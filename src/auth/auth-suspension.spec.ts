import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRole } from '../users/entities/user.entity';

describe('AuthService account suspension', () => {
  it('does not issue an access token to a suspended user', async () => {
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        email: 'user@example.test',
        passwordHash: await bcrypt.hash('correct-password', 4),
        role: UserRole.USER,
        emailVerified: true,
        suspendedAt: new Date(),
      }),
    };
    const jwt = { signAsync: jest.fn() };
    const service = new AuthService(
      users as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      jwt as never,
    );

    await expect(
      service.login({
        email: 'user@example.test',
        password: 'correct-password',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
