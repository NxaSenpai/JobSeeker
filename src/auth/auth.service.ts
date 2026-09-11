import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { EmailService } from '../email/email.service';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { EmailVerificationToken } from './entities/email-verification-token.entity';

type RegistrationInput = {
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  contactName?: string;
  termsAccepted: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(EmailVerificationToken)
    private readonly verificationTokenRepository: Repository<EmailVerificationToken>,

    private readonly emailService: EmailService,

    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        emailVerified: true,
        firstName: true,
        lastName: true,
        companyName: true,
        contactName: true,
      },
    });

    const passwordMatches = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email address before signing in.',
      );
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        contactName: user.contactName,
      },
    };
  }

  async registerUser(dto: RegisterUserDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    if (!dto.acceptedTerms) {
      throw new BadRequestException(
        'You must accept the terms of service to register.',
      );
    }

    return this.register({
      email: dto.email,
      password: dto.password,
      role: UserRole.USER,
      firstName: dto.firstName,
      lastName: dto.lastName,
      termsAccepted: true,
    });
  }

  async registerCompany(dto: RegisterCompanyDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    return this.register({
      email: dto.email,
      password: dto.password,
      role: UserRole.COMPANY,
      companyName: dto.companyName,
      contactName: dto.contactName,
      termsAccepted: false,
    });
  }

  async sendVerificationEmail(user: User) {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const verificationToken = this.verificationTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.verificationTokenRepository.save(verificationToken);
    await this.emailService.sendVerificationEmail(
      user.email,
      rawToken,
      this.getVerificationName(user),
    );

    return {
      message: 'Verification email sent successfully.',
    };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const verificationToken = await this.verificationTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid verification token.');
    }

    if (verificationToken.expiresAt.getTime() <= Date.now()) {
      await this.verificationTokenRepository.delete(verificationToken.id);

      throw new BadRequestException('Verification token has expired.');
    }

    const user = await this.userRepository.findOne({
      where: { id: verificationToken.userId },
    });

    if (!user) {
      throw new BadRequestException('User account was not found.');
    }

    if (user.emailVerified) {
      await this.verificationTokenRepository.delete(verificationToken.id);

      return {
        message: 'Email is already verified.',
      };
    }

    user.emailVerified = true;
    await this.userRepository.save(user);
    await this.verificationTokenRepository.delete(verificationToken.id);

    return {
      message: 'Email verified successfully.',
    };
  }

  async resendVerificationEmail(dto: ResendVerificationDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || user.emailVerified) {
      return {
        message:
          'If an unverified account exists for this email, a new verification email has been sent.',
      };
    }

    await this.sendVerificationEmail(user);

    return {
      message:
        'If an unverified account exists for this email, a new verification email has been sent.',
    };
  }

  private async register(input: RegistrationInput) {
    const email = input.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser?.emailVerified) {
      throw new ConflictException(
        'An account with this email address already exists.',
      );
    }

    if (existingUser) {
      await this.sendVerificationEmail(existingUser);

      return {
        message:
          'This account is not verified yet. A new verification email has been sent.',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          emailVerified: existingUser.emailVerified,
        },
      };
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = this.userRepository.create({
      email,
      passwordHash,
      role: input.role,
      emailVerified: false,
      termsAccepted: input.termsAccepted,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      companyName: input.companyName ?? null,
      contactName: input.contactName ?? null,
    });

    const savedUser = await this.userRepository.save(user);
    await this.sendVerificationEmail(savedUser);

    return {
      message: 'Account created. Check your email to verify your account.',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        emailVerified: savedUser.emailVerified,
      },
    };
  }

  private getVerificationName(user: User) {
    const fullName = [user.firstName, user.lastName]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ')
      .trim();

    return (
      fullName ||
      user.contactName?.trim() ||
      user.companyName?.trim() ||
      'there'
    );
  }
}
