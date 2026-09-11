import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';

import { EmailService } from '../email/email.service';
import { User, UserRole } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { EmailVerificationToken } from './entities/email-verification-token.entity';

describe('AuthService email verification', () => {
  let service: AuthService;
  let userRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let verificationTokenRepository: {
    findOne: jest.Mock;
    delete: jest.Mock;
  };
  let emailService: Pick<EmailService, 'sendVerificationEmail'>;
  let jwtService: { signAsync: jest.Mock };

  const rawToken = 'raw-verification-token';
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    verificationTokenRepository = {
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    emailService = {
      sendVerificationEmail: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };

    service = new AuthService(
      userRepository as unknown as Repository<User>,
      verificationTokenRepository as unknown as Repository<EmailVerificationToken>,
      emailService as EmailService,
      jwtService as JwtService,
    );
  });

  it('rejects a token that is not found by its hash', async () => {
    verificationTokenRepository.findOne.mockResolvedValue(null);

    await expect(service.verifyEmail(rawToken)).rejects.toThrow(
      new BadRequestException('Invalid verification token.'),
    );
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('deletes and rejects an expired token', async () => {
    verificationTokenRepository.findOne.mockResolvedValue({
      id: 'token-id',
      tokenHash,
      userId: 'user-id',
      expiresAt: new Date(Date.now() - 1),
    });

    await expect(service.verifyEmail(rawToken)).rejects.toThrow(
      'Verification token has expired.',
    );
    expect(verificationTokenRepository.delete).toHaveBeenCalledWith('token-id');
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects a token whose user no longer exists', async () => {
    verificationTokenRepository.findOne.mockResolvedValue({
      id: 'token-id',
      tokenHash,
      userId: 'missing-user',
      expiresAt: new Date(Date.now() + 60_000),
    });
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.verifyEmail(rawToken)).rejects.toThrow(
      'User account was not found.',
    );
    expect(verificationTokenRepository.delete).not.toHaveBeenCalled();
  });

  it('cleans up the token when the account is already verified', async () => {
    verificationTokenRepository.findOne.mockResolvedValue({
      id: 'token-id',
      tokenHash,
      userId: 'user-id',
      expiresAt: new Date(Date.now() + 60_000),
    });
    userRepository.findOne.mockResolvedValue({
      id: 'user-id',
      emailVerified: true,
    });

    await expect(service.verifyEmail(rawToken)).resolves.toEqual({
      message: 'Email is already verified.',
    });
    expect(verificationTokenRepository.delete).toHaveBeenCalledWith('token-id');
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('marks the user verified and deletes a valid token', async () => {
    const user = {
      id: 'user-id',
      emailVerified: false,
    };
    verificationTokenRepository.findOne.mockResolvedValue({
      id: 'token-id',
      tokenHash,
      userId: 'user-id',
      expiresAt: new Date(Date.now() + 60_000),
    });
    userRepository.findOne.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);

    await expect(service.verifyEmail(rawToken)).resolves.toEqual({
      message: 'Email verified successfully.',
    });
    expect(user.emailVerified).toBe(true);
    expect(userRepository.save).toHaveBeenCalledWith(user);
    expect(verificationTokenRepository.delete).toHaveBeenCalledWith('token-id');
  });

  describe('login', () => {
    it('returns an access token for a verified user with the correct password', async () => {
      const user = {
        id: 'user-id',
        email: 'user@example.com',
        passwordHash: await bcrypt.hash('correct-password', 4),
        role: UserRole.USER,
        emailVerified: true,
        firstName: 'Sok',
        lastName: 'Sao',
        companyName: null,
        contactName: null,
      };
      userRepository.findOne.mockResolvedValue(user);
      jwtService.signAsync.mockResolvedValue('signed-access-token');

      await expect(
        service.login({
          email: ' USER@example.com ',
          password: 'correct-password',
        }),
      ).resolves.toEqual({
        accessToken: 'signed-access-token',
        user: {
          id: 'user-id',
          email: 'user@example.com',
          role: UserRole.USER,
          emailVerified: true,
          firstName: 'Sok',
          lastName: 'Sao',
          companyName: null,
          contactName: null,
        },
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-id',
        email: 'user@example.com',
        role: UserRole.USER,
      });
    });

    it('rejects an unverified user before issuing a token', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        passwordHash: await bcrypt.hash('correct-password', 4),
        role: UserRole.COMPANY,
        emailVerified: false,
      });

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'correct-password',
        }),
      ).rejects.toThrow('Please verify your email address before signing in.');
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
