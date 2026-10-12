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
import { Company } from '../account/entities/company.entity';
import { User } from '../users/entities/user.entity';
import { CompanyService } from './company.service';

@Injectable()
export class CompanyLogoService {
  private readonly directory: string;

  constructor(
    @InjectRepository(Company)
    private readonly companies: Repository<Company>,
    private readonly companyService: CompanyService,
    config: ConfigService,
  ) {
    this.directory = resolve(
      config.get<string>('COMPANY_LOGO_UPLOAD_DIR') ?? 'uploads/company-logos',
    );
  }

  async upload(user: User, file?: Express.Multer.File) {
    if (
      !file ||
      file.size > 5 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    ) {
      throw new BadRequestException(
        'Choose a JPG, PNG, or WebP company logo up to 5 MB.',
      );
    }

    let buffer: Buffer;
    try {
      const image = sharp(file.buffer, { limitInputPixels: 25_000_000 });
      const metadata = await image.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? ''))
        throw new Error('Invalid image format');
      buffer = await image
        .rotate()
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 88 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'This logo could not be read. Choose a valid JPG, PNG, or WebP image.',
      );
    }

    const company = await this.companyService.ensureOwnProfile(user);
    const key = `${randomUUID()}.jpg`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.path(key), buffer, { flag: 'wx' });

    let oldKey: string | null = null;
    try {
      await this.companies.manager.transaction(async (manager) => {
        const current = await manager
          .getRepository(Company)
          .createQueryBuilder('company')
          .where('company.id = :id AND company.ownerUserId = :ownerUserId', {
            id: company.id,
            ownerUserId: user.id,
          })
          .setLock('pessimistic_write')
          .getOne();
        if (!current)
          throw new NotFoundException('Company profile was not found.');
        oldKey = this.keyFromUrl(current.logoUrl);
        current.logoUrl = this.urlFor(current.id, key);
        await manager.save(current);
      });
    } catch (error) {
      await unlink(this.path(key)).catch(() => undefined);
      throw error;
    }

    if (oldKey) await unlink(this.path(oldKey)).catch(() => undefined);
    return this.companyService.ownProfile(user);
  }

  async openOwn(user: User) {
    const company = await this.companyService.ensureOwnProfile(user);
    return this.openKey(this.keyFromUrl(company.logoUrl));
  }

  async openPublic(identifier: string) {
    const company = await this.companyService.findPublic(identifier);
    return this.openKey(this.keyFromUrl(company.logoUrl));
  }

  async remove(user: User) {
    const company = await this.companyService.ensureOwnProfile(user);
    let oldKey: string | null = null;
    await this.companies.manager.transaction(async (manager) => {
      const current = await manager
        .getRepository(Company)
        .createQueryBuilder('company')
        .where('company.id = :id AND company.ownerUserId = :ownerUserId', {
          id: company.id,
          ownerUserId: user.id,
        })
        .setLock('pessimistic_write')
        .getOne();
      if (!current)
        throw new NotFoundException('Company profile was not found.');
      oldKey = this.keyFromUrl(current.logoUrl);
      current.logoUrl = null;
      await manager.save(current);
    });
    if (oldKey) await unlink(this.path(oldKey)).catch(() => undefined);
    return { removed: true };
  }

  private async openKey(key: string | null) {
    if (!key) throw new NotFoundException('Company logo was not found.');
    const path = this.path(key);
    try {
      await stat(path);
    } catch {
      throw new NotFoundException('Company logo was not found.');
    }
    return createReadStream(path);
  }

  private path(key: string) {
    if (!/^[\da-f-]{36}\.jpg$/i.test(key))
      throw new NotFoundException('Company logo was not found.');
    return join(this.directory, key);
  }

  private keyFromUrl(value: string | null) {
    const match = value?.match(
      /^\/companies\/[\da-f-]{36}\/logo\?v=([\da-f-]{36}\.jpg)$/i,
    );
    return match?.[1] ?? null;
  }

  private urlFor(companyId: string, key: string) {
    return `/companies/${companyId}/logo?v=${key}`;
  }
}
