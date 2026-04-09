import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContentModule } from './content/content.module';
import { GenresModule } from './genres/genres.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ListModule } from './list/list.module';
import { User } from './users/entities/user.entity';
import { ContentItem } from './content/entities/content-item.entity';
import { Genre } from './genres/entities/genre.entity';
import { Review } from './reviews/entities/review.entity';
import { ListEntry } from './list/entities/list-entry.entity';
import { Follow } from './users/entities/follow.entity';
import { ListPositionHistory } from './list/entities/list-position-history.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [User, ContentItem, Genre, Review, ListEntry, Follow, ListPositionHistory],
            synchronize: false,
            ssl: { rejectUnauthorized: false },
          }
        : {
            type: 'postgres',
            host: process.env.DATABASE_HOST || 'localhost',
            port: parseInt(process.env.DATABASE_PORT || '5432'),
            username: process.env.DATABASE_USERNAME || 'postgres',
            password: process.env.DATABASE_PASSWORD || 'password',
            database: process.env.DATABASE_NAME || 'thelist',
            entities: [User, ContentItem, Genre, Review, ListEntry, Follow, ListPositionHistory],
            synchronize: true,
          },
    ),
    AuthModule,
    UsersModule,
    ContentModule,
    GenresModule,
    ReviewsModule,
    ListModule,
  ],
})
export class AppModule {}
