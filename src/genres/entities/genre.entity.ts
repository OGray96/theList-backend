import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { ContentItem } from '../../content/entities/content-item.entity';

@Entity('genres')
export class Genre {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @ManyToMany(() => ContentItem, (item) => item.genres)
  contentItems: ContentItem[];
}
