import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { ContentType } from './entities/content-item.entity';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: ContentType,
    @Query('genre') genre?: string,
    @Query('year') year?: string,
  ) {
    return this.contentService.findAll({
      search,
      type,
      genre,
      year: year ? parseInt(year) : undefined,
    });
  }

  @Get('search-external')
  @UseGuards(JwtAuthGuard)
  searchExternal(
    @Query('q') q: string,
    @Query('type') type: ContentType,
  ) {
    return this.contentService.searchExternal(q, type);
  }

  @Get(':id/stats')
  getContentStats(@Param('id') id: string) {
    return this.contentService.getContentStats(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateContentDto) {
    return this.contentService.create(dto);
  }

  @Patch(':id/genres')
  @UseGuards(JwtAuthGuard)
  updateGenres(
    @Param('id') id: string,
    @Body() body: { genres: string[] },
  ) {
    return this.contentService.updateGenres(id, body.genres);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.contentService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.contentService.remove(id);
  }
}
