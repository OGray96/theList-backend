import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ContentItem } from '../content/entities/content-item.entity';
import { Genre } from '../genres/entities/genre.entity';
import { Review } from '../reviews/entities/review.entity';
import { ListEntry } from '../list/entities/list-entry.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'thelist',
  entities: [User, ContentItem, Genre, Review, ListEntry],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
