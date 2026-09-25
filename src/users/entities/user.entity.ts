import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserProfile } from '../../account/entities/user-profile.entity';

export enum UserRole {
  USER = 'USER',
  COMPANY = 'COMPANY',
  ADMIN = 'ADMIN',
}

@Entity('users')
@Check(
  'CHK_users_suspension_reason',
  '"suspendedAt" IS NULL OR "suspensionReason" IS NOT NULL',
)
@Check('CHK_users_session_version', '"sessionVersion" >= 0')
@Index('IDX_users_suspendedAt_createdAt', ['suspendedAt', 'createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'varchar', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ default: false })
  termsAccepted: boolean;

  @Column({ type: 'varchar', nullable: true })
  companyName: string | null;

  @Column({ type: 'varchar', nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  headline: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  location: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  suspendedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  suspensionReason: string | null;

  @Column({ type: 'integer', default: 0 })
  sessionVersion: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile: UserProfile;
}
