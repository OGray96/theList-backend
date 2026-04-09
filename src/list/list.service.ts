import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ListEntry } from './entities/list-entry.entity';
import { ListPositionHistory } from './entities/list-position-history.entity';
import { ContentType } from '../content/entities/content-item.entity';
import { ReorderListDto } from './dto/reorder-list.dto';

@Injectable()
export class ListService {
  constructor(
    @InjectRepository(ListEntry)
    private readonly listEntriesRepo: Repository<ListEntry>,
    @InjectRepository(ListPositionHistory)
    private readonly historyRepo: Repository<ListPositionHistory>,
    private readonly dataSource: DataSource,
  ) {}

  async getUserList(
    username: string,
    filters: { type?: ContentType; genre?: string; year?: number },
  ): Promise<ListEntry[]> {
    const qb = this.listEntriesRepo
      .createQueryBuilder('entry')
      .innerJoin('entry.user', 'user')
      .leftJoinAndSelect('entry.contentItem', 'content')
      .leftJoinAndSelect('content.genres', 'genre')
      .leftJoinAndSelect('entry.review', 'review')
      .where('user.username = :username', { username })
      .orderBy('entry.position', 'ASC');

    if (filters.type) qb.andWhere('content.type = :type', { type: filters.type });
    if (filters.year) qb.andWhere('content.releaseYear = :year', { year: filters.year });
    if (filters.genre) qb.andWhere('genre.name ILIKE :genre', { genre: `%${filters.genre}%` });

    return qb.getMany();
  }

  async getHistory(username: string): Promise<ListPositionHistory[]> {
    return this.historyRepo
      .createQueryBuilder('h')
      .innerJoin('h.user', 'user')
      .leftJoinAndSelect('h.contentItem', 'ci')
      .leftJoinAndSelect('ci.genres', 'genre')
      .where('user.username = :username', { username })
      .orderBy('h.changedAt', 'DESC')
      .take(50)
      .getMany();
  }

  async recordHistory(
    userId: string,
    changes: { contentItemId: string; fromPosition: number | null; toPosition: number | null }[],
  ): Promise<void> {
    if (!changes.length) return;
    const records = changes.map((c) =>
      this.historyRepo.create({
        userId,
        contentItemId: c.contentItemId,
        fromPosition: c.fromPosition,
        toPosition: c.toPosition,
      }),
    );
    await this.historyRepo.save(records);
  }

  async reorder(userId: string, dto: ReorderListDto): Promise<void> {
    const { orderedEntryIds } = dto;

    const entries = await this.listEntriesRepo.find({
      where: { userId },
      relations: { contentItem: true },
    });
    const ownedMap = new Map(entries.map((e) => [e.id, e]));

    for (const id of orderedEntryIds) {
      if (!ownedMap.has(id)) {
        throw new ForbiddenException(`Entry ${id} does not belong to this user`);
      }
    }

    // Compute position changes for history
    const changes: { contentItemId: string; fromPosition: number; toPosition: number }[] = [];
    orderedEntryIds.forEach((id, index) => {
      const entry = ownedMap.get(id)!;
      const newPos = index + 1;
      if (entry.position !== newPos) {
        changes.push({ contentItemId: entry.contentItemId, fromPosition: entry.position, toPosition: newPos });
      }
    });

    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < orderedEntryIds.length; i++) {
        await manager.update(ListEntry, orderedEntryIds[i], { position: i + 1 });
      }
    });

    await this.recordHistory(userId, changes);
  }

  async getTopByMedian(
    type: ContentType,
    minReviews = 5,
  ): Promise<{ contentItem: any; medianPosition: number; reviewCount: number }[]> {
    const entries = await this.listEntriesRepo
      .createQueryBuilder('entry')
      .innerJoinAndSelect('entry.contentItem', 'ci')
      .leftJoinAndSelect('ci.genres', 'genre')
      .where('ci.type = :type', { type })
      .getMany();

    const grouped = new Map<string, { contentItem: any; positions: number[] }>();
    for (const entry of entries) {
      const key = entry.contentItemId;
      if (!grouped.has(key)) {
        grouped.set(key, { contentItem: entry.contentItem, positions: [] });
      }
      grouped.get(key)!.positions.push(entry.position);
    }

    const results: { contentItem: any; medianPosition: number; reviewCount: number }[] = [];
    for (const [, data] of grouped) {
      if (data.positions.length >= minReviews) {
        const sorted = [...data.positions].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median =
          sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
        results.push({ contentItem: data.contentItem, medianPosition: median, reviewCount: data.positions.length });
      }
    }

    return results.sort((a, b) => a.medianPosition - b.medianPosition);
  }
}
