import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SessionRequest } from '../auth/session.guard';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class JobSeekerGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (
      context.switchToHttp().getRequest<SessionRequest>().user.role !==
      UserRole.USER
    )
      throw new ForbiddenException('This action is available to job seekers.');
    return true;
  }
}
