import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { OmdbSeedService } from './omdb-seed.service';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('admin/seed')
@UseGuards(AdminGuard)
export class OmdbSeedController {
  constructor(private readonly seedService: OmdbSeedService) {}

  @Get('status')
  status() {
    return this.seedService.getStatus();
  }

  @Post('run')
  run(@Body() body: { limit?: number }) {
    const limit = Math.min(body?.limit ?? 980, 980);
    return this.seedService.runBatch(limit);
  }
}
