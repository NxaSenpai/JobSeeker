import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AvatarService } from '../account/avatar.service';
import { SessionGuard } from '../auth/session.guard';
import { AdminRoleGuard } from './admin-role.guard';

@Controller('api/v1/admin/users')
@UseGuards(SessionGuard, AdminRoleGuard)
export class AdminUserAvatarController {
  constructor(private readonly avatars: AvatarService) {}

  @Get(':id/avatar')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return new StreamableFile(await this.avatars.open(id), {
      type: 'image/jpeg',
      disposition: 'inline',
    });
  }
}
