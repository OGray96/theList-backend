import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { ListEntry } from '../list/entities/list-entry.entity';
import { ContentItem } from '../content/entities/content-item.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepo: Repository<Review>,
    @InjectRepository(ListEntry)
    private readonly listEntriesRepo: Repository<ListEntry>,
    private readonly dataSource: DataSource,
  ) {}

  async findRecent(
    page = 1,
    limit = 20,
    type?: string,
    criticOnly = false,
  ): Promise<Review[]> {
    const qb = this.reviewsRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.reviewer', 'reviewer')
      .leftJoinAndSelect('review.contentItem', 'content')
      .leftJoinAndSelect('content.genres', 'genre')
      .leftJoinAndSelect('review.listEntry', 'listEntry')
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) qb.andWhere('content.type = :type', { type });
    if (criticOnly) qb.andWhere('reviewer.isCritic = true');

    return qb.getMany();
  }

  async findFeed(
    followingIds: string[],
    page = 1,
    limit = 20,
    type?: string,
  ): Promise<Review[]> {
    if (!followingIds.length) return [];
    const qb = this.reviewsRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.reviewer', 'reviewer')
      .leftJoinAndSelect('review.contentItem', 'content')
      .leftJoinAndSelect('content.genres', 'genre')
      .leftJoinAndSelect('review.listEntry', 'listEntry')
      .where('review.reviewerId IN (:...ids)', { ids: followingIds })
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) qb.andWhere('content.type = :type', { type });

    return qb.getMany();
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewsRepo.findOne({
      where: { id },
      relations: { reviewer: true, listEntry: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    return this.dataSource.transaction(async (manager) => {
      // Determine content type for per-type position management
      const contentItem = await manager.findOne(ContentItem, {
        where: { id: dto.contentItemId },
      });
      const contentType = contentItem?.type;

      // Count same-type entries to determine default position
      const sameTypeEntries = await manager
        .createQueryBuilder(ListEntry, 'entry')
        .innerJoin('entry.contentItem', 'ci')
        .where('entry.userId = :userId', { userId })
        .andWhere('ci.type = :type', { type: contentType })
        .getMany();

      const targetPosition = dto.position ?? sameTypeEntries.length + 1;

      // Shift same-type entries at/below target position down by 1
      if (dto.position) {
        const idsToShift = sameTypeEntries
          .filter((e) => e.position >= targetPosition)
          .map((e) => e.id);
        if (idsToShift.length > 0) {
          await manager
            .createQueryBuilder()
            .update(ListEntry)
            .set({ position: () => 'position + 1' })
            .where('id IN (:...ids)', { ids: idsToShift })
            .execute();
        }
      }

      // Create the list entry first (without review)
      const listEntry = manager.create(ListEntry, {
        userId,
        contentItemId: dto.contentItemId,
        position: targetPosition,
      });
      const savedEntry = await manager.save(ListEntry, listEntry);

      // Create the review linked to the list entry
      const review = manager.create(Review, {
        body: dto.body ?? '',
        dateReviewed: dto.dateReviewed ?? new Date().toISOString().split('T')[0],
        reviewerId: userId,
        contentItemId: dto.contentItemId,
        listEntry: savedEntry,
      });
      const savedReview = await manager.save(Review, review);

      // Link the review back to the list entry
      await manager.update(ListEntry, savedEntry.id, {
        reviewId: savedReview.id,
      });

      return manager.findOne(Review, {
        where: { id: savedReview.id },
        relations: { reviewer: true, listEntry: true },
      });
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.reviewsRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.reviewerId !== userId)
      throw new ForbiddenException('Not your review');

    Object.assign(review, dto);
    return this.reviewsRepo.save(review);
  }

  async remove(id: string, userId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const review = await manager.findOne(Review, {
        where: { id },
        relations: { listEntry: { contentItem: true } },
      });
      if (!review) throw new NotFoundException('Review not found');
      if (review.reviewerId !== userId)
        throw new ForbiddenException('Not your review');

      const position = review.listEntry?.position;
      const contentType = review.listEntry?.contentItem?.type;

      // Delete the review (list entry's reviewId goes null via SET NULL)
      await manager.remove(Review, review);

      // Delete the list entry
      if (review.listEntry) {
        await manager.remove(ListEntry, review.listEntry);
      }

      // Close the gap for same-type entries only
      if (position && contentType) {
        const idsToShift = await manager
          .createQueryBuilder(ListEntry, 'entry')
          .innerJoin('entry.contentItem', 'ci')
          .where('entry.userId = :userId', { userId })
          .andWhere('ci.type = :type', { type: contentType })
          .andWhere('entry.position > :pos', { pos: position })
          .getMany()
          .then((entries) => entries.map((e) => e.id));

        if (idsToShift.length > 0) {
          await manager
            .createQueryBuilder()
            .update(ListEntry)
            .set({ position: () => 'position - 1' })
            .where('id IN (:...ids)', { ids: idsToShift })
            .execute();
        }
      }
    });
  }
}
