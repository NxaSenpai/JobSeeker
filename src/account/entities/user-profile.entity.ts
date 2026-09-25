import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import type {
  EducationDto,
  ExperienceDto,
  LanguageDto,
} from '../profile-details.dto';

@Entity('user_profiles')
@Index('IDX_user_profiles_userId', ['userId'], { unique: true })
export class UserProfile {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 100, default: '' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  lastName: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  headline: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  profileImageUrl: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  websiteUrl: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  linkedinUrl: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  githubUrl: string | null;

  @Column({ default: false })
  isOpenToWork: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  skills: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  education: EducationDto[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  experience: ExperienceDto[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  languages: LanguageDto[];

  @Column({ type: 'varchar', length: 100, nullable: true, select: false })
  avatarKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
