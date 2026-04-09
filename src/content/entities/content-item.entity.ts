import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Genre } from '../../genres/entities/genre.entity';
import { Review } from '../../reviews/entities/review.entity';
import { ListEntry } from '../../list/entities/list-entry.entity';

export enum ContentType {
  MOVIE = 'Movie',
  TV = 'TV',
  VIDEO_GAME = 'VideoGame',
}

@Entity('content_items')
export class ContentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: ContentType })
  type: ContentType;

  @Column()
  releaseYear: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ nullable: true })
  coverImageUrl: string | null;

  @ManyToMany(() => Genre, (genre) => genre.contentItems, { eager: true })
  @JoinTable({ name: 'content_genres' })
  genres: Genre[];

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Review, (review) => review.contentItem)
  reviews: Review[];

  @OneToMany(() => ListEntry, (entry) => entry.contentItem)
  listEntries: ListEntry[];
}
