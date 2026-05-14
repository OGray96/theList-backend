import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentItem, ContentType } from '../content/entities/content-item.entity';
import { SeedState } from './seed-state.entity';

const SEARCH_TERMS = [
  'the', 'a', 'love', 'man', 'dark', 'last', 'first', 'night', 'day',
  'black', 'white', 'red', 'dead', 'life', 'war', 'blood', 'home',
  'star', 'lost', 'fire', 'king', 'city', 'dream', 'shadow', 'wild',
  'girl', 'boy', 'son', 'father', 'world', 'time', 'power', 'great',
  'little', 'big', 'end', 'rise', 'fall', 'run', 'back', 'law',
  'blue', 'gold', 'secret', 'face', 'name', 'road', 'young', 'old',
  'one', 'new', 'american', 'house', 'street', 'beyond', 'out', 'after',
  'cold', 'hot', 'wrong', 'never', 'forever', 'truth', 'ghost', 'edge',
];

const YEARS = Array.from({ length: 55 }, (_, i) => 1970 + i);
const TYPES = ['movie', 'series'] as const;

const ALL_COMBOS = TYPES.flatMap((type) =>
  YEARS.flatMap((year) =>
    SEARCH_TERMS.map((term) => ({ term, year, type })),
  ),
);
// 2 × 55 × 68 = 7,480 total combinations

const DELAY_MS = 110; // ~9 requests/sec, safely under OMDb limits

@Injectable()
export class OmdbSeedService {
  constructor(
    @InjectRepository(ContentItem)
    private readonly contentRepo: Repository<ContentItem>,
    @InjectRepository(SeedState)
    private readonly seedStateRepo: Repository<SeedState>,
  ) {}

  async getStatus() {
    const state = await this.getOrCreateState();
    return {
      cursor: state.cursor,
      totalCombinations: ALL_COMBOS.length,
      percentComplete: Math.round((state.cursor / ALL_COMBOS.length) * 100),
      totalInserted: state.totalInserted,
      lastRunAt: state.lastRunAt,
    };
  }

  async runBatch(limit = 980): Promise<{ requests: number; inserted: number; skipped: number; cursor: number }> {
    const apiKey = process.env.OMDB_API_KEY;
    if (!apiKey) throw new Error('OMDB_API_KEY not set');

    const state = await this.getOrCreateState();
    let cursor = state.cursor;
    let requests = 0;
    let inserted = 0;
    let skipped = 0;

    while (requests < limit) {
      const combo = ALL_COMBOS[cursor];

      try {
        const results = await this.searchOmdb(combo.term, combo.year, combo.type, apiKey);
        requests++;

        for (const result of results) {
          const saved = await this.upsertItem(result);
          if (saved) inserted++;
          else skipped++;
        }
      } catch {
        // skip failed requests, don't burn the daily limit on retries
      }

      cursor = (cursor + 1) % ALL_COMBOS.length;
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    state.cursor = cursor;
    state.totalInserted += inserted;
    state.lastRunAt = new Date();
    await this.seedStateRepo.save(state);

    return { requests, inserted, skipped, cursor };
  }

  private async searchOmdb(
    term: string,
    year: number,
    type: 'movie' | 'series',
    apiKey: string,
  ): Promise<{ imdbId: string; title: string; year: number; contentType: ContentType; poster: string | null }[]> {
    const params = new URLSearchParams({ s: term, y: String(year), type, apikey: apiKey });
    const res = await fetch(`https://www.omdbapi.com/?${params}`);
    const data = await res.json();

    if (data.Response !== 'True' || !Array.isArray(data.Search)) return [];

    return data.Search
      .filter((item: any) => item.imdbID && item.imdbID !== 'N/A')
      .map((item: any) => ({
        imdbId: item.imdbID,
        title: item.Title,
        year: parseInt(item.Year) || year,
        contentType: item.Type === 'series' ? ContentType.TV : ContentType.MOVIE,
        poster: item.Poster && item.Poster !== 'N/A' ? item.Poster : null,
      }));
  }

  private async upsertItem(data: {
    imdbId: string;
    title: string;
    year: number;
    contentType: ContentType;
    poster: string | null;
  }): Promise<boolean> {
    const exists = await this.contentRepo.findOne({ where: { imdbId: data.imdbId } });
    if (exists) return false;

    const item = this.contentRepo.create({
      imdbId: data.imdbId,
      title: data.title,
      releaseYear: data.year,
      type: data.contentType,
      coverImageUrl: data.poster,
      genres: [],
    });
    await this.contentRepo.save(item);
    return true;
  }

  private async getOrCreateState(): Promise<SeedState> {
    let state = await this.seedStateRepo.findOne({ where: { id: 1 } });
    if (!state) {
      state = this.seedStateRepo.create({ id: 1, cursor: 0, totalInserted: 0, lastRunAt: null });
      await this.seedStateRepo.save(state);
    }
    return state;
  }
}
