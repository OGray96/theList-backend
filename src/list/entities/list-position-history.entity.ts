import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ContentItem } from '../../content/entities/content-item.entity';

@Entity('list_position_history')
export class ListPositionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  contentItemId: string;

  @ManyToOne(() => ContentItem, { eager: true, onDelete: 'CASCADE' })
  contentItem: ContentItem;

  @Column({ nullable: true, type: 'int' })
  fromPosition: number | null;

  @Column({ nullable: true, type: 'int' })
  toPosition: number | null;

  @CreateDateColumn()
  changedAt: Date;
}
