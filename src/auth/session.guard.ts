import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

export type SessionRequest = Request & { user: User };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const match = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('Please sign in to continue.');

    request.user = await this.authenticateToken(match[1]);
    return true;
  }

  async authenticateToken(token: string): Promise<User> {
    let subject: string;
    let payloadSessionVersion = 0;
    try {
      const payload = await this.jwt.verifyAsync<{
        sub?: string;
        exp?: number;
        sessionVersion?: number;
      }>(token, { algorithms: ['HS256'] });
      if (
        !payload.sub ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          payload.sub,
        ) ||
        typeof payload.exp !== 'number' ||
        (payload.sessionVersion !== undefined &&
          (!Number.isSafeInteger(payload.sessionVersion) ||
            payload.sessionVersion < 0))
      )
        throw new Error('Invalid session');
      subject = payload.sub;
      payloadSessionVersion = payload.sessionVersion ?? 0;
    } catch {
      throw new UnauthorizedException(
        'Your session has expired. Please sign in again.',
      );
    }
    const user = await this.users.findOne({ where: { id: subject } });
    if (!user?.emailVerified)
      throw new UnauthorizedException(
        'Please sign in with a verified account.',
      );
    if (user.suspendedAt)
      throw new ForbiddenException({
        message: 'This account is suspended.',
        reason: user.suspensionReason,
      });
    if ((user.sessionVersion ?? 0) !== (payloadSessionVersion ?? 0)) {
      throw new UnauthorizedException(
        'Your session is no longer valid. Please sign in again.',
      );
    }
    return user;
  }
}
