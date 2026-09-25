import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, type SessionRequest } from '../auth/session.guard';
import { UpdateProfileDto } from './account.dto';
import { JobSeekerGuard } from './job-seeker.guard';
import { ProfileService } from './profile.service';

@Controller('api/v1/users/me')
@UseGuards(SessionGuard, JobSeekerGuard)
export class UserProfileController {
  constructor(private readonly profiles: ProfileService) {}
  @Get() get(@Req() req: SessionRequest) {
    return this.profiles.getProfile(req.user);
  }
  @Patch() update(@Req() req: SessionRequest, @Body() dto: UpdateProfileDto) {
    return this.profiles.updateProfile(req.user, dto);
  }
}
