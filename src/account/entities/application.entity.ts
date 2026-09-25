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
import { Resume } from './resume.entity';
import { Job } from './job.entity';

export enum ApplicationStatus {
  APPLIED = 'APPLIED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SHORTLISTED = 'SHORTLISTED',
  INTERVIEW = 'INTERVIEW',
  OFFERED = 'OFFERED',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

@Entity('applications')
@Check(
  'CHK_applications_status',
  "\"status\" IN ('APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN')",
)
@Index('UQ_applications_user_job', ['userId', 'jobId'], { unique: true })
export class Application {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') userId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
  @Column({ type: 'varchar', length: 100 }) jobId: string;
  @ManyToOne(() => Job, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'jobId' })
  job: Job;
  @Column('uuid') resumeId: string;
  @ManyToOne(() => Resume, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'resumeId' })
  resume: Resume;
  @Column({ type: 'varchar', length: 30, default: ApplicationStatus.APPLIED })
  status: ApplicationStatus;
  @Column('text') description: string;
  @Column({ type: 'text', default: '' }) coverLetter: string;
  @Column({ type: 'varchar', length: 40, default: '' }) phone: string;
  @Column({ type: 'varchar', length: 2048, default: '' }) portfolioUrl: string;
  @Column('jsonb') candidate: Record<string, unknown>;
  @Column('jsonb')
  history: {
    status: ApplicationStatus;
    at: string;
    changedBy?: 'CANDIDATE' | 'COMPANY' | 'SYSTEM';
  }[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
