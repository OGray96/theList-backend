import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ContentItem } from '../../content/entities/content-item.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('list_entries')
@Unique('UQ_user_content', ['userId', 'contentItemId'])
export class ListEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  position: number;

  @ManyToOne(() => User, (user) => user.listEntries, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => ContentItem, (item) => item.listEntries, {
    eager: true,
    onDelete: 'CASCADE',
  })
  contentItem: ContentItem;

  @Column()
  contentItemId: string;

  @OneToOne(() => Review, (review) => review.listEntry, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  review: Review | null;

  @Column({ nullable: true })
  reviewId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
