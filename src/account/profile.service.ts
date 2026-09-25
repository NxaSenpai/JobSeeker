import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { publicUser } from '../auth/public-user';
import { User } from '../users/entities/user.entity';
import { UpdateProfileDto } from './account.dto';
import { UserProfile } from './entities/user-profile.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profiles: Repository<UserProfile>,
  ) {}

  async getForUser(user: User) {
    const existing = await this.profiles.findOne({
      where: { userId: user.id },
    });

    if (existing) return existing;

    try {
      return await this.profiles.save(
        this.profiles.create({
          id: user.id,
          userId: user.id,
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          headline: user.headline ?? null,
          bio: user.bio ?? null,
          phone: null,
          profileImageUrl: null,
          dateOfBirth: null,
          location: user.location ?? null,
          websiteUrl: null,
          linkedinUrl: null,
          githubUrl: null,
          isOpenToWork: false,
          skills: [],
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        return this.profiles.findOneByOrFail({ userId: user.id });
      throw error;
    }
  }

  async getProfile(user: User) {
    return {
      user: publicUser(user),
      profile: this.publicProfile(await this.getForUser(user)),
    };
  }

  async updateProfile(user: User, dto: UpdateProfileDto) {
    for (const [key, value] of Object.entries(dto)) {
      if (value === null)
        throw new BadRequestException(
          `${key} cannot be null. Use an empty string to clear a field.`,
        );
    }
    for (const entry of [...(dto.education ?? []), ...(dto.experience ?? [])]) {
      if (entry.endDate && entry.endDate < entry.startDate)
        throw new BadRequestException('End date cannot be before start date.');
      if (entry.startDate > new Date().toISOString().slice(0, 10))
        throw new BadRequestException('Start date cannot be in the future.');
    }
    if (
      dto.dateOfBirth &&
      dto.dateOfBirth > new Date().toISOString().slice(0, 10)
    )
      throw new BadRequestException('Date of birth cannot be in the future.');
    await this.getForUser(user);
    return this.profiles.manager.transaction(async (manager) => {
      const profiles = manager.getRepository(UserProfile);
      const users = manager.getRepository(User);
      const profile = await profiles.findOneOrFail({
        where: { userId: user.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (dto.firstName !== undefined) profile.firstName = dto.firstName;
      if (dto.lastName !== undefined) profile.lastName = dto.lastName;
      if (dto.headline !== undefined)
        profile.headline = dto.headline.trim() || null;
      if (dto.location !== undefined)
        profile.location = dto.location.trim() || null;
      if (dto.bio !== undefined) profile.bio = dto.bio.trim() || null;
      if (dto.phone !== undefined) profile.phone = dto.phone.trim() || null;
      if (dto.dateOfBirth !== undefined)
        profile.dateOfBirth = dto.dateOfBirth || null;
      if (dto.websiteUrl !== undefined)
        profile.websiteUrl = dto.websiteUrl || null;
      if (dto.linkedinUrl !== undefined)
        profile.linkedinUrl = dto.linkedinUrl || null;
      if (dto.githubUrl !== undefined)
        profile.githubUrl = dto.githubUrl || null;
      if (dto.isOpenToWork !== undefined)
        profile.isOpenToWork = dto.isOpenToWork;
      if (dto.skills !== undefined)
        profile.skills = this.normalizeSkills(dto.skills);

      if (dto.education !== undefined) profile.education = dto.education;
      if (dto.experience !== undefined)
        profile.experience = dto.experience.map((item) => ({
          ...item,
          endDate: item.current ? '' : item.endDate,
        }));
      if (dto.languages !== undefined) profile.languages = dto.languages;

      const savedProfile = await profiles.save(profile);
      await users.update(user.id, {
        firstName: savedProfile.firstName,
        lastName: savedProfile.lastName,
        headline: savedProfile.headline,
        location: savedProfile.location,
        bio: savedProfile.bio,
      });
      const updatedUser = await users.findOneByOrFail({ id: user.id });

      return {
        user: publicUser(updatedUser),
        profile: this.publicProfile(savedProfile),
      };
    });
  }

  publicProfile(profile: UserProfile) {
    return {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      headline: profile.headline,
      bio: profile.bio,
      phone: profile.phone,
      profileImageUrl: profile.profileImageUrl,
      dateOfBirth: profile.dateOfBirth,
      location: profile.location,
      websiteUrl: profile.websiteUrl,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      isOpenToWork: profile.isOpenToWork,
      skills: profile.skills ?? [],
      education: profile.education ?? [],
      experience: profile.experience ?? [],
      languages: profile.languages ?? [],
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private normalizeSkills(skills: string[]) {
    return [
      ...new Set(skills.map((skill) => skill.trim()).filter(Boolean)),
    ].slice(0, 30);
  }
}
