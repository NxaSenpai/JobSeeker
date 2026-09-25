import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../account/entities/company.entity';
import { UserRole } from '../users/entities/user.entity';
import type { SessionRequest } from '../auth/session.guard';

@Injectable()
export class CompanyRoleGuard implements CanActivate {
  constructor(
    @InjectRepository(Company) private readonly companies: Repository<Company>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    if (request.user?.role !== UserRole.COMPANY) {
      throw new ForbiddenException('This action is available to companies.');
    }
    const company = await this.companies.findOneBy({
      ownerUserId: request.user.id,
    });
    if (company?.suspendedAt)
      throw new ForbiddenException({
        message: 'This company account is suspended.',
        reason: company.suspensionReason,
      });
    return true;
  }
}
