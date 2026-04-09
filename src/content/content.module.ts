import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { ContentItem } from './entities/content-item.entity';
import { GenresModule } from '../genres/genres.module';
import { ListModule } from '../list/list.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContentItem]), GenresModule, ListModule],
  providers: [ContentService],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
