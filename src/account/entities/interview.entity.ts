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
import { Application } from './application.entity';

export enum InterviewType {
  ONLINE = 'ONLINE',
  ONSITE = 'ONSITE',
  PHONE = 'PHONE',
}

export enum InterviewStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
}

@Entity('interviews')
@Check('CHK_interviews_type', "\"type\" IN ('ONLINE', 'ONSITE', 'PHONE')")
@Check('CHK_interviews_status', "\"status\" IN ('SCHEDULED', 'CANCELLED')")
@Check(
  'CHK_interviews_location',
  '"type" <> \'ONSITE\' OR NULLIF(btrim("location"), \'\') IS NOT NULL',
)
@Check(
  'CHK_interviews_meeting_url',
  '"type" <> \'ONLINE\' OR NULLIF(btrim("meetingUrl"), \'\') IS NOT NULL',
)
@Index('IDX_interviews_application_scheduled', ['applicationId', 'scheduledAt'])
@Index('IDX_interviews_scheduledAt', ['scheduledAt'])
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User | null;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'varchar', length: 20 })
  type: InterviewType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  meetingUrl: string | null;

  // These are candidate-visible instructions, not confidential employer notes.
  @Column({ type: 'text', default: '' })
  notes: string;

  @Column({ type: 'varchar', length: 20, default: InterviewStatus.SCHEDULED })
  status: InterviewStatus;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
