import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentItem, ContentType } from './entities/content-item.entity';
import { GenresService } from '../genres/genres.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ListEntry } from '../list/entities/list-entry.entity';

// Static TMDB genre ID → name mappings
const TMDB_MOVIE_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 14: 'Fantasy',
  36: 'History', 27: 'Horror', 10402: 'Musical', 9648: 'Mystery',
  10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller', 10752: 'War', 37: 'Western',
};
const TMDB_TV_GENRES: Record<number, string> = {
  10759: 'Action', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 9648: 'Mystery', 10764: 'Reality',
  10765: 'Sci-Fi', 10767: 'Talk Show', 37: 'Western', 10766: 'Soap Opera',
};

export interface ExternalSearchResult {
  title: string;
  type: ContentType;
  releaseYear: number | null;
  genres: string[];
  coverImageUrl: string | null;
  description: string | null;
  externalId: string;
}

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentItem)
    private readonly contentRepo: Repository<ContentItem>,
    @InjectRepository(ListEntry)
    private readonly listEntriesRepo: Repository<ListEntry>,
    private readonly genresService: GenresService,
  ) {}

  async findAll(filters: {
    search?: string;
    type?: ContentType;
    genre?: string;
    year?: number;
  }): Promise<ContentItem[]> {
    const qb = this.contentRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.genres', 'genre')
      .orderBy('item.title', 'ASC');

    if (filters.search) {
      qb.andWhere('item.title ILIKE :search', { search: `%${filters.search}%` });
    }
    if (filters.type) {
      qb.andWhere('item.type = :type', { type: filters.type });
    }
    if (filters.year) {
      qb.andWhere('item.releaseYear = :year', { year: filters.year });
    }
    if (filters.genre) {
      qb.andWhere('genre.name ILIKE :genre', { genre: `%${filters.genre}%` });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<ContentItem> {
    const item = await this.contentRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Content not found');
    return item;
  }

  async create(dto: CreateContentDto): Promise<ContentItem> {
    const genres = await Promise.all(
      (dto.genres || []).map((name) => this.genresService.findOrCreate(name)),
    );
    const item = this.contentRepo.create({
      title: dto.title,
      type: dto.type,
      releaseYear: dto.releaseYear,
      description: dto.description ?? null,
      coverImageUrl: dto.coverImageUrl ?? null,
      genres,
    });
    return this.contentRepo.save(item);
  }

  async update(id: string, dto: UpdateContentDto): Promise<ContentItem> {
    const item = await this.findOne(id);

    if (dto.genres !== undefined) {
      item.genres = await Promise.all(
        dto.genres.map((name) => this.genresService.findOrCreate(name)),
      );
    }

    Object.assign(item, {
      ...(dto.title && { title: dto.title }),
      ...(dto.type && { type: dto.type }),
      ...(dto.releaseYear && { releaseYear: dto.releaseYear }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
    });

    return this.contentRepo.save(item);
  }

  async updateGenres(id: string, genreNames: string[]): Promise<ContentItem> {
    const item = await this.findOne(id);
    item.genres = await Promise.all(
      genreNames.map((name) => this.genresService.findOrCreate(name)),
    );
    return this.contentRepo.save(item);
  }

  async getContentStats(id: string): Promise<{
    contentItem: ContentItem;
    stats: { min: number; max: number; median: number; reviewCount: number };
    entries: ListEntry[];
  }> {
    const contentItem = await this.contentRepo.findOne({
      where: { id },
      relations: ['genres'],
    });
    if (!contentItem) throw new NotFoundException('Content not found');

    const entries = await this.listEntriesRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('entry.review', 'review')
      .where('entry.contentItemId = :id', { id })
      .orderBy('entry.position', 'ASC')
      .getMany();

    const positions = entries.map((e) => e.position).sort((a, b) => a - b);
    const count = positions.length;
    let median = 0;
    if (count > 0) {
      const mid = Math.floor(count / 2);
      median = count % 2 === 0 ? (positions[mid - 1] + positions[mid]) / 2 : positions[mid];
    }

    return {
      contentItem,
      stats: {
        min: positions[0] ?? 0,
        max: positions[count - 1] ?? 0,
        median,
        reviewCount: count,
      },
      entries,
    };
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.contentRepo.remove(item);
  }

  async searchExternal(
    query: string,
    type: ContentType,
  ): Promise<ExternalSearchResult[]> {
    const tmdbKey = process.env.TMDB_API_KEY;
    const rawgKey = process.env.RAWG_API_KEY;

    try {
      if (type === ContentType.MOVIE && tmdbKey) {
        return this.searchTMDBMovies(query, tmdbKey);
      }
      if (type === ContentType.TV && tmdbKey) {
        return this.searchTMDBTV(query, tmdbKey);
      }
      if (type === ContentType.VIDEO_GAME && rawgKey) {
        return this.searchRAWG(query, rawgKey);
      }
    } catch {
      // fall through and return empty
    }

    return [];
  }

  private async searchTMDBMovies(
    query: string,
    apiKey: string,
  ): Promise<ExternalSearchResult[]> {
    const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${apiKey}&page=1`;
    const res = await fetch(url);
    const data = await res.json();

    return (data.results || []).slice(0, 6).map((item: any) => ({
      title: item.title,
      type: ContentType.MOVIE,
      releaseYear: item.release_date
        ? parseInt(item.release_date.split('-')[0])
        : null,
      genres: (item.genre_ids || [])
        .map((id: number) => TMDB_MOVIE_GENRES[id])
        .filter(Boolean),
      coverImageUrl: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null,
      description: item.overview || null,
      externalId: String(item.id),
    }));
  }

  private async searchTMDBTV(
    query: string,
    apiKey: string,
  ): Promise<ExternalSearchResult[]> {
    const url = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&api_key=${apiKey}&page=1`;
    const res = await fetch(url);
    const data = await res.json();

    return (data.results || []).slice(0, 6).map((item: any) => ({
      title: item.name,
      type: ContentType.TV,
      releaseYear: item.first_air_date
        ? parseInt(item.first_air_date.split('-')[0])
        : null,
      genres: (item.genre_ids || [])
        .map((id: number) => TMDB_TV_GENRES[id])
        .filter(Boolean),
      coverImageUrl: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null,
      description: item.overview || null,
      externalId: String(item.id),
    }));
  }

  private async searchRAWG(
    query: string,
    apiKey: string,
  ): Promise<ExternalSearchResult[]> {
    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&key=${apiKey}&page_size=6`;
    const res = await fetch(url);
    const data = await res.json();

    return (data.results || []).map((item: any) => ({
      title: item.name,
      type: ContentType.VIDEO_GAME,
      releaseYear: item.released
        ? parseInt(item.released.split('-')[0])
        : null,
      genres: (item.genres || []).map((g: any) => g.name),
      coverImageUrl: item.background_image || null,
      description: null,
      externalId: String(item.id),
    }));
  }
}
