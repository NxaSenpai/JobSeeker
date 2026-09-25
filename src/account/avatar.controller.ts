import {
  Controller,
  Delete,
  Get,
  Header,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionGuard, type SessionRequest } from '../auth/session.guard';
import { AvatarService } from './avatar.service';
import { JobSeekerGuard } from './job-seeker.guard';

@Controller(['api/v1/account/profile/avatar', 'api/v1/users/me/avatar'])
@UseGuards(SessionGuard, JobSeekerGuard)
export class AvatarController {
  constructor(private readonly avatars: AvatarService) {}
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @Req() req: SessionRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.avatars.upload(req.user, file);
  }
  @Get()
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async get(@Req() req: SessionRequest) {
    return new StreamableFile(await this.avatars.open(req.user.id), {
      type: 'image/jpeg',
      disposition: 'inline',
    });
  }
  @Delete() remove(@Req() req: SessionRequest) {
    return this.avatars.remove(req.user);
  }
}
