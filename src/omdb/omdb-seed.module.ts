import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OmdbSeedService } from './omdb-seed.service';
import { OmdbSeedController } from './omdb-seed.controller';
import { ContentItem } from '../content/entities/content-item.entity';
import { SeedState } from './seed-state.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContentItem, SeedState])],
  providers: [OmdbSeedService],
  controllers: [OmdbSeedController],
})
export class OmdbSeedModule {}
