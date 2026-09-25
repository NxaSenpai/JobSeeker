import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('application_drafts')
export class ApplicationDraft {
  @PrimaryColumn('uuid')
  userId: string;

  @PrimaryColumn({ type: 'varchar', length: 100 })
  jobId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text', default: '' })
  coverLetter: string;

  @Column({ type: 'varchar', length: 2048, default: '' })
  resumeUrl: string;

  @Column({ type: 'uuid', nullable: true }) resumeId: string | null;
  @Column({ type: 'text', default: '' }) description: string;
  @Column({ type: 'varchar', length: 40, default: '' }) phone: string;
  @Column({ type: 'varchar', length: 2048, default: '' }) portfolioUrl: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
