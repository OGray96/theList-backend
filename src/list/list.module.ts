import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListService } from './list.service';
import { ListController } from './list.controller';
import { ListEntry } from './entities/list-entry.entity';
import { ListPositionHistory } from './entities/list-position-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ListEntry, ListPositionHistory])],
  providers: [ListService],
  controllers: [ListController],
  exports: [ListService, TypeOrmModule],
})
export class ListModule {}
