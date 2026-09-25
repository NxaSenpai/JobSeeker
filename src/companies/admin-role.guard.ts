import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';
import type { SessionRequest } from '../auth/session.guard';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    if (request.user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('This action is available to admins.');
    }
    return true;
  }
}
