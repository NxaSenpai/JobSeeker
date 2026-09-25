import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';

import { EmailService } from '../email/email.service';
import { UserProfile } from '../account/entities/user-profile.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';

describe('AuthService email verification', () => {
  let service: AuthService;
  let userRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let verificationTokenRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };
  let passwordResetTokenRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };
  let userProfileRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let emailService: Pick<
    EmailService,
    'sendVerificationEmail' | 'sendPasswordResetEmail'
  >;
  let jwtService: { signAsync: jest.Mock };

  const rawToken = 'raw-verification-token';
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    verificationTokenRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    passwordResetTokenRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    userProfileRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    emailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };

    service = new AuthService(
      userRepository as unknown as Repository<User>,
      verificationTokenRepository as unknown as Repository<EmailVerificationToken>,
      passwordResetTokenRepository as unknown as Repository<PasswordResetToken>,
      userProfileRepository as unknown as Repository<UserProfile>,
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
        sessionVersion: 0,
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

  describe('registration profile', () => {
    it('creates one profile for a new job seeker', async () => {
      const user = {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.USER,
        emailVerified: false,
        firstName: 'Sok',
        lastName: 'Sao',
        headline: null,
        location: null,
        bio: null,
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(user);
      userRepository.save.mockResolvedValue(user);
      userProfileRepository.findOne.mockResolvedValue(null);
      userProfileRepository.create.mockImplementation((data) => data);
      userProfileRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      verificationTokenRepository.create.mockImplementation((data) => data);
      verificationTokenRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      emailService.sendVerificationEmail.mockResolvedValue({ id: 'email-id' });

      await service.registerUser({
        firstName: 'Sok',
        lastName: 'Sao',
        email: 'user@example.com',
        password: 'password-123',
        confirmPassword: 'password-123',
        acceptedTerms: true,
      });

      expect(userProfileRepository.create).toHaveBeenCalledWith({
        id: 'user-id',
        userId: 'user-id',
        firstName: 'Sok',
        lastName: 'Sao',
        headline: null,
        bio: null,
        phone: null,
        profileImageUrl: null,
        dateOfBirth: null,
        location: null,
        websiteUrl: null,
        linkedinUrl: null,
        githubUrl: null,
        isOpenToWork: false,
        skills: [],
      });
      expect(userProfileRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('resend verification email', () => {
    it('invalidates previous tokens before creating and sending a new one', async () => {
      const user = {
        id: 'user-id',
        email: 'user@example.com',
        emailVerified: false,
        firstName: 'Sok',
        lastName: 'Sao',
      };
      const newToken = {
        id: 'new-token-id',
        userId: user.id,
        tokenHash: 'new-token-hash',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };

      userRepository.findOne.mockResolvedValue(user);
      verificationTokenRepository.create.mockReturnValue(newToken);
      verificationTokenRepository.save.mockResolvedValue(newToken);
      emailService.sendVerificationEmail.mockResolvedValue({ id: 'email-id' });

      await expect(
        service.resendVerificationEmail({ email: ' USER@example.com ' }),
      ).resolves.toEqual({
        message:
          'If an unverified account exists for this email, a new verification email has been sent.',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(verificationTokenRepository.delete).toHaveBeenCalledWith({
        userId: 'user-id',
      });
      expect(verificationTokenRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      });
      expect(verificationTokenRepository.save).toHaveBeenCalledWith(newToken);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
        'Sok Sao',
      );
      expect(
        verificationTokenRepository.delete.mock.invocationCallOrder[0],
      ).toBeLessThan(
        verificationTokenRepository.create.mock.invocationCallOrder[0],
      );
    });

    it('does not send or delete tokens for an unknown or verified account', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await service.resendVerificationEmail({ email: 'unknown@example.com' });

      expect(verificationTokenRepository.delete).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('forgot password', () => {
    it('replaces previous reset tokens and sends a hashed-token email', async () => {
      const user = {
        id: 'user-id',
        email: 'user@example.com',
        emailVerified: true,
        firstName: 'Sok',
        lastName: 'Sao',
      };
      const resetToken = {
        id: 'reset-token-id',
        userId: user.id,
        tokenHash: 'reset-token-hash',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };

      userRepository.findOne.mockResolvedValue(user);
      passwordResetTokenRepository.create.mockReturnValue(resetToken);
      passwordResetTokenRepository.save.mockResolvedValue(resetToken);
      emailService.sendPasswordResetEmail.mockResolvedValue({ id: 'email-id' });

      await expect(
        service.forgotPassword({ email: ' USER@example.com ' }),
      ).resolves.toEqual({
        message: 'If an account exists, a password reset email has been sent.',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(passwordResetTokenRepository.delete).toHaveBeenCalledWith({
        userId: 'user-id',
      });
      expect(passwordResetTokenRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      });
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
        'Sok Sao',
      );
    });

    it('returns the same response without sending for an unknown email', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'unknown@example.com' }),
      ).resolves.toEqual({
        message: 'If an account exists, a password reset email has been sent.',
      });

      expect(passwordResetTokenRepository.delete).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('reset password', () => {
    it('changes the password and invalidates all reset tokens', async () => {
      const rawResetToken = 'raw-reset-token';
      const resetTokenHash = createHash('sha256')
        .update(rawResetToken)
        .digest('hex');
      const user = {
        id: 'user-id',
        email: 'user@example.com',
        passwordHash: 'old-password-hash',
      };

      passwordResetTokenRepository.findOne.mockResolvedValue({
        id: 'reset-token-id',
        tokenHash: resetTokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);

      await expect(
        service.resetPassword({
          token: rawResetToken,
          password: 'new-password',
          confirmPassword: 'new-password',
        }),
      ).resolves.toEqual({
        message: 'Password reset successfully. You can sign in now.',
      });

      await expect(
        bcrypt.compare('new-password', user.passwordHash),
      ).resolves.toBe(true);
      expect(userRepository.save).toHaveBeenCalledWith(user);
      expect(passwordResetTokenRepository.delete).toHaveBeenCalledWith({
        userId: 'user-id',
      });
    });

    it('rejects an expired reset token and deletes it', async () => {
      passwordResetTokenRepository.findOne.mockResolvedValue({
        id: 'reset-token-id',
        tokenHash: 'expired-token-hash',
        userId: 'user-id',
        expiresAt: new Date(Date.now() - 1),
      });

      await expect(
        service.resetPassword({
          token: 'expired-token',
          password: 'new-password',
          confirmPassword: 'new-password',
        }),
      ).rejects.toThrow('Invalid or expired password reset token.');

      expect(passwordResetTokenRepository.delete).toHaveBeenCalledWith(
        'reset-token-id',
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('rejects mismatched passwords before checking the token', async () => {
      await expect(
        service.resetPassword({
          token: 'raw-reset-token',
          password: 'new-password',
          confirmPassword: 'different-password',
        }),
      ).rejects.toThrow('Passwords do not match.');

      expect(passwordResetTokenRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
