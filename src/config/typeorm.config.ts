import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ContentItem } from '../content/entities/content-item.entity';
import { Genre } from '../genres/entities/genre.entity';
import { Review } from '../reviews/entities/review.entity';
import { ListEntry } from '../list/entities/list-entry.entity';
import { Follow } from '../users/entities/follow.entity';
import { ListPositionHistory } from '../list/entities/list-position-history.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL ? undefined : (process.env.DATABASE_HOST || 'localhost'),
  port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_URL ? undefined : (process.env.DATABASE_USERNAME || 'postgres'),
  password: process.env.DATABASE_URL ? undefined : (process.env.DATABASE_PASSWORD || 'password'),
  database: process.env.DATABASE_URL ? undefined : (process.env.DATABASE_NAME || 'thelist'),
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  entities: [User, ContentItem, Genre, Review, ListEntry, Follow, ListPositionHistory],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
