import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notifications')
@Index('IDX_notifications_user', ['userId'])
export class Notification {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') userId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
  @Column({ type: 'varchar', length: 240 }) title: string;
  @Column('text') message: string;
  @Column({ type: 'varchar', length: 200 }) link: string;
  @Column({ type: 'timestamptz', nullable: true }) readAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}
