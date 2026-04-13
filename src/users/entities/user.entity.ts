import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Review } from '../../reviews/entities/review.entity';
import { ListEntry } from '../../list/entities/list-entry.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ length: 100 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ nullable: true })
  avatarUrl: string | null;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: false })
  isCritic: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ type: 'text', nullable: true })
  emailVerificationToken: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Review, (review) => review.reviewer)
  reviews: Review[];

  @OneToMany(() => ListEntry, (entry) => entry.user)
  listEntries: ListEntry[];
}
