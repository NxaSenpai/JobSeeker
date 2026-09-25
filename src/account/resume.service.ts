import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Resume } from './entities/resume.entity';
import { Application } from './entities/application.entity';
import { ProfileService } from './profile.service';

const MAX_RESUMES_PER_PROFILE = 10;
const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);
  private readonly uploadDirectory: string;

  constructor(
    @InjectRepository(Resume)
    private readonly resumes: Repository<Resume>,
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    private readonly profiles: ProfileService,
    config: ConfigService,
  ) {
    this.uploadDirectory = resolve(
      process.cwd(),
      config.get<string>('RESUME_UPLOAD_DIR') ?? 'uploads/resumes',
    );
  }

  async list(user: User) {
    const profile = await this.profiles.getForUser(user);
    const resumes = await this.resumes.find({
      where: { profileId: profile.id },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
    return { resumes: resumes.map((resume) => this.publicResume(resume)) };
  }

  async upload(user: User, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('A PDF resume is required.');
    if (file.size > MAX_RESUME_FILE_SIZE) {
      throw new PayloadTooLargeException('Your PDF must be 10 MB or smaller.');
    }
    if (
      file.mimetype !== 'application/pdf' ||
      file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-'
    ) {
      throw new UnsupportedMediaTypeException('Only PDF resumes are allowed.');
    }

    const profile = await this.profiles.getForUser(user);
    const existingCount = await this.resumes.countBy({ profileId: profile.id });
    if (existingCount >= MAX_RESUMES_PER_PROFILE) {
      throw new BadRequestException(
        `You can store up to ${MAX_RESUMES_PER_PROFILE} resumes.`,
      );
    }

    await mkdir(this.uploadDirectory, { recursive: true });
    const storageKey = `${randomUUID()}.pdf`;
    const storagePath = this.pathForKey(storageKey);
    await writeFile(storagePath, file.buffer, { flag: 'wx' });

    const resume = this.resumes.create({
      id: randomUUID(),
      profileId: profile.id,
      fileName: this.safeFileName(file.originalname),
      storageKey,
      mimeType: 'application/pdf',
      fileSize: file.size,
      isDefault: existingCount === 0,
    });

    try {
      return { resume: this.publicResume(await this.resumes.save(resume)) };
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }
  }

  async open(user: User, id: string) {
    const resume = await this.ownedResume(user, id);
    return this.openStoredFile(resume);
  }

  async openForCompany(companyId: string, applicationId: string) {
    const application = await this.applications
      .createQueryBuilder('application')
      .innerJoin('application.job', 'job')
      .innerJoinAndSelect('application.resume', 'resume')
      .where('application.id = :applicationId', { applicationId })
      .andWhere('job.companyId = :companyId', { companyId })
      .getOne();
    if (!application) throw new NotFoundException('Application was not found.');
    return this.openStoredFile(application.resume);
  }

  private async openStoredFile(resume: Resume) {
    const storagePath = this.pathForKey(resume.storageKey);

    try {
      await stat(storagePath);
    } catch {
      throw new NotFoundException('Resume file was not found.');
    }

    return {
      resume,
      stream: createReadStream(storagePath),
    };
  }

  async setDefault(user: User, id: string) {
    const resume = await this.ownedResume(user, id);
    await this.resumes.update(
      { profileId: resume.profileId, isDefault: true },
      { isDefault: false },
    );
    await this.resumes.update(
      { id: resume.id, profileId: resume.profileId },
      { isDefault: true },
    );
    resume.isDefault = true;
    return { resume: this.publicResume(resume) };
  }

  async remove(user: User, id: string) {
    const resume = await this.ownedResume(user, id);
    try {
      await this.resumes.delete({ id: resume.id, profileId: resume.profileId });
    } catch (error) {
      if (['23503', '23001'].includes((error as { code?: string }).code ?? ''))
        throw new ConflictException(
          'This résumé is attached to a submitted application and must be kept with its history. You can upload a new résumé instead.',
        );
      throw error;
    }

    await unlink(this.pathForKey(resume.storageKey)).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not delete resume file ${resume.id}: ${message}`);
    });

    if (resume.isDefault) {
      const replacement = await this.resumes.findOne({
        where: { profileId: resume.profileId },
        order: { createdAt: 'DESC' },
      });
      if (replacement) {
        replacement.isDefault = true;
        await this.resumes.save(replacement);
      }
    }

    return { removed: true };
  }

  private async ownedResume(user: User, id: string) {
    const profile = await this.profiles.getForUser(user);
    const resume = await this.resumes.findOne({
      where: { id, profileId: profile.id },
    });
    if (!resume) throw new NotFoundException('Resume was not found.');
    return resume;
  }

  private safeFileName(value: string) {
    const fileName = basename(value)
      .replace(/\p{Cc}/gu, '')
      .trim()
      .slice(0, 255);
    return fileName || 'resume.pdf';
  }

  private pathForKey(storageKey: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i.test(
        storageKey,
      )
    ) {
      throw new NotFoundException('Resume file was not found.');
    }
    return join(this.uploadDirectory, storageKey);
  }

  private publicResume(resume: Resume) {
    return {
      id: resume.id,
      fileName: resume.fileName,
      mimeType: resume.mimeType,
      fileSize: resume.fileSize,
      isDefault: resume.isDefault,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
      previewUrl: `/api/v1/account/resumes/${resume.id}/preview`,
      downloadUrl: `/api/v1/account/resumes/${resume.id}/download`,
    };
  }
}
