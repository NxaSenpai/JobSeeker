import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReportSubjectType {
  JOB = 'JOB',
  COMPANY = 'COMPANY',
  USER = 'USER',
}

export enum ReportCategory {
  SCAM = 'SCAM',
  HARASSMENT = 'HARASSMENT',
  FALSE_INFORMATION = 'FALSE_INFORMATION',
  INAPPROPRIATE = 'INAPPROPRIATE',
  EXPIRED_OR_FILLED = 'EXPIRED_OR_FILLED',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

@Entity('abuse_reports')
@Check(
  'CHK_abuse_reports_subject_type',
  "\"subjectType\" IN ('JOB', 'COMPANY', 'USER')",
)
@Check(
  'CHK_abuse_reports_category',
  "\"category\" IN ('SCAM', 'HARASSMENT', 'FALSE_INFORMATION', 'INAPPROPRIATE', 'EXPIRED_OR_FILLED', 'OTHER')",
)
@Check(
  'CHK_abuse_reports_status',
  "\"status\" IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')",
)
@Check(
  'CHK_abuse_reports_description',
  'char_length(btrim("description")) BETWEEN 20 AND 3000',
)
@Check(
  'CHK_abuse_reports_not_self',
  '"subjectType" <> \'USER\' OR lower("subjectId") <> lower("reporterUserId"::text)',
)
@Check(
  'CHK_abuse_reports_review_state',
  '("status" = \'OPEN\' AND "reviewedByUserId" IS NULL AND "reviewedAt" IS NULL AND "resolutionNote" IS NULL) OR ("status" = \'IN_REVIEW\' AND "reviewedByUserId" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "resolutionNote" IS NULL) OR ("status" IN (\'RESOLVED\', \'DISMISSED\') AND "reviewedByUserId" IS NOT NULL AND "reviewedAt" IS NOT NULL AND char_length(btrim("resolutionNote")) BETWEEN 3 AND 500)',
)
@Index('IDX_abuse_reports_status_createdAt', ['status', 'createdAt'])
@Index('IDX_abuse_reports_reporter_createdAt', ['reporterUserId', 'createdAt'])
@Index('IDX_abuse_reports_subject', ['subjectType', 'subjectId'])
@Index(
  'UQ_abuse_reports_active_reporter_subject',
  ['reporterUserId', 'subjectType', 'subjectId'],
  {
    unique: true,
    where: "\"status\" IN ('OPEN', 'IN_REVIEW')",
  },
)
export class AbuseReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  reporterUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reporterUserId' })
  reporter: User;

  @Column({ type: 'varchar', length: 20 })
  subjectType: ReportSubjectType;

  // Polymorphic reference: job IDs are slugs while company/user IDs are UUIDs.
  // No cascading FK is used so report history survives later target removal.
  @Column({ type: 'varchar', length: 100 })
  subjectId: string;

  @Column({ type: 'varchar', length: 40 })
  category: ReportCategory;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20, default: ReportStatus.OPEN })
  status: ReportStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewedByUserId' })
  reviewedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  resolutionNote: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
