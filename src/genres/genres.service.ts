import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Genre } from './entities/genre.entity';

@Injectable()
export class GenresService {
  constructor(
    @InjectRepository(Genre)
    private readonly genresRepo: Repository<Genre>,
  ) {}

  findAll(): Promise<Genre[]> {
    return this.genresRepo.find({ order: { name: 'ASC' } });
  }

  async findOrCreate(name: string): Promise<Genre> {
    const existing = await this.genresRepo.findOne({ where: { name } });
    if (existing) return existing;
    const genre = this.genresRepo.create({ name });
    return this.genresRepo.save(genre);
  }
}
