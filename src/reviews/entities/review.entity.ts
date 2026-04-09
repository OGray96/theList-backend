import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ContentItem } from '../../content/entities/content-item.entity';
import { ListEntry } from '../../list/entities/list-entry.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'date' })
  dateReviewed: string;

  @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
  reviewer: User;

  @Column()
  reviewerId: string;

  @ManyToOne(() => ContentItem, (item) => item.reviews, {
    eager: true,
    onDelete: 'CASCADE',
  })
  contentItem: ContentItem;

  @Column()
  contentItemId: string;

  @OneToOne(() => ListEntry, (entry) => entry.review)
  listEntry: ListEntry;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
