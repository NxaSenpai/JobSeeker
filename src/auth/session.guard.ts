import {
  CanActivate,
  ExecutionContext,
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

    let subject: string;
    try {
      const payload = await this.jwt.verifyAsync<{
        sub?: string;
        exp?: number;
      }>(match[1], { algorithms: ['HS256'] });
      if (
        !payload.sub ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          payload.sub,
        ) ||
        typeof payload.exp !== 'number'
      )
        throw new Error('Invalid session');
      subject = payload.sub;
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
    // Always authorize using the current database role, never a client-supplied role.
    request.user = user;
    return true;
  }
}
