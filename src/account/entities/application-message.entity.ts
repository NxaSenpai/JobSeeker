import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Application } from './application.entity';

@Entity('application_messages')
@Check(
  'CHK_application_messages_body',
  'length(btrim("body")) BETWEEN 1 AND 5000',
)
@Check(
  'CHK_application_messages_participants',
  '"senderUserId" <> "recipientUserId"',
)
@Index('IDX_application_messages_thread_created', [
  'applicationId',
  'createdAt',
  'id',
])
@Index('IDX_application_messages_sender_created', [
  'applicationId',
  'senderUserId',
  'createdAt',
])
@Index('IDX_application_messages_recipient_read', [
  'applicationId',
  'recipientUserId',
  'readAt',
])
export class ApplicationMessage {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column('uuid') applicationId: string;
  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column('uuid') senderUserId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderUserId' })
  sender: User;

  @Column('uuid') recipientUserId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientUserId' })
  recipient: User;

  @Column('text') body: string;
  @Column({ type: 'timestamptz', nullable: true }) readAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
