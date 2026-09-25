import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { ProfileService } from './profile.service';

@Injectable()
export class AvatarService {
  private readonly directory: string;
  constructor(
    @InjectRepository(UserProfile)
    private readonly profiles: Repository<UserProfile>,
    private readonly profileService: ProfileService,
    config: ConfigService,
  ) {
    this.directory = resolve(
      config.get<string>('AVATAR_UPLOAD_DIR') ?? 'uploads/avatars',
    );
  }
  async upload(user: User, file?: Express.Multer.File) {
    if (
      !file ||
      file.size > 5 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    )
      throw new BadRequestException(
        'Choose a JPG, PNG, or WebP photo up to 5 MB.',
      );
    let buffer: Buffer;
    try {
      const image = sharp(file.buffer, { limitInputPixels: 25_000_000 });
      const metadata = await image.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? ''))
        throw new Error('Invalid format');
      // Decode and re-encode to strip metadata and any appended active content.
      buffer = await image
        .rotate()
        .resize(512, 512, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'This photo could not be read. Choose a valid JPG, PNG, or WebP image.',
      );
    }
    const profile = await this.profileService.getForUser(user);
    const key = `${randomUUID()}.jpg`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.path(key), buffer, { flag: 'wx' });
    let oldKey: string | null = null;
    try {
      await this.profiles.manager.transaction(async (manager) => {
        const current = await manager
          .getRepository(UserProfile)
          .createQueryBuilder('profile')
          .addSelect('profile.avatarKey')
          .where('profile.id = :id', { id: profile.id })
          .setLock('pessimistic_write')
          .getOneOrFail();
        oldKey = current.avatarKey;
        await manager.update(UserProfile, profile.id, {
          avatarKey: key,
          profileImageUrl: `/api/v1/account/profile/avatar?v=${key}`,
        });
      });
    } catch (error) {
      await unlink(this.path(key)).catch(() => undefined);
      throw error;
    }
    if (oldKey) await unlink(this.path(oldKey)).catch(() => undefined);
    return this.profileService.getProfile(user);
  }
  async open(userId: string) {
    const profile = await this.profiles
      .createQueryBuilder('profile')
      .addSelect('profile.avatarKey')
      .where('profile.userId = :userId', { userId })
      .getOne();
    if (!profile?.avatarKey)
      throw new NotFoundException('Profile photo was not found.');
    const path = this.path(profile.avatarKey);
    try {
      await stat(path);
    } catch {
      throw new NotFoundException('Profile photo was not found.');
    }
    return createReadStream(path);
  }
  async remove(user: User) {
    let oldKey: string | null = null;
    await this.profiles.manager.transaction(async (manager) => {
      const profile = await manager
        .getRepository(UserProfile)
        .createQueryBuilder('profile')
        .addSelect('profile.avatarKey')
        .where('profile.userId = :id', { id: user.id })
        .setLock('pessimistic_write')
        .getOne();
      if (!profile) return;
      oldKey = profile.avatarKey;
      await manager.update(UserProfile, profile.id, {
        avatarKey: null,
        profileImageUrl: null,
      });
    });
    if (oldKey) await unlink(this.path(oldKey)).catch(() => undefined);
    return { removed: true };
  }
  private path(key: string) {
    if (!/^[\da-f-]{36}\.jpg$/i.test(key))
      throw new NotFoundException('Profile photo was not found.');
    return join(this.directory, key);
  }
}
