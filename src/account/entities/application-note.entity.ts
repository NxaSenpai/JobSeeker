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
import { Application } from './application.entity';
import { User } from '../../users/entities/user.entity';

@Entity('application_notes')
@Check('CHK_application_notes_body', 'length(btrim("body")) BETWEEN 1 AND 5000')
@Index('IDX_application_notes_application_created', [
  'applicationId',
  'createdAt',
])
export class ApplicationNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column({ type: 'uuid', nullable: true })
  authorUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorUserId' })
  author: User | null;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
