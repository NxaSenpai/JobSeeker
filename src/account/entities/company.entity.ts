import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('companies')
@Check('CHK_companies_owner', '"isDemo" = true OR "ownerUserId" IS NOT NULL')
@Check(
  'CHK_companies_suspension_reason',
  '"suspendedAt" IS NULL OR "suspensionReason" IS NOT NULL',
)
@Check(
  'CHK_companies_moderation_note',
  '"isVerified" = false OR "moderationNote" IS NULL',
)
@Index('UQ_companies_ownerUserId', ['ownerUserId'], {
  unique: true,
  where: '"ownerUserId" IS NOT NULL',
})
@Index('UQ_companies_slug', ['slug'], { unique: true })
@Index('IDX_companies_industry', ['industry'])
@Index('IDX_companies_suspendedAt_createdAt', ['suspendedAt', 'createdAt'])
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Demo/editorial company rows may have no account owner. Real company rows
  // are always scoped to exactly one verified COMPANY user.
  @Column({ type: 'uuid', nullable: true })
  ownerUserId: string | null;

  @OneToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'ownerUserId' })
  owner: User | null;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  slug: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  industry: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  companySize: string | null;

  @Column({ type: 'smallint', nullable: true })
  foundedYear: number | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // This is an explicitly supplied public contact address, never the account
  // sign-in email by default.
  @Column({ type: 'varchar', length: 320, nullable: true })
  contactEmail: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  timezone: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  socialLinks: Record<string, string>;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  bannerUrl: string | null;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  suspendedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  suspensionReason: string | null;

  @Column({ type: 'text', nullable: true })
  moderationNote: string | null;

  @Column({ default: false })
  isDemo: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
