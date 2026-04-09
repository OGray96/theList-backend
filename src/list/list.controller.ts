import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ListService } from './list.service';
import { ReorderListDto } from './dto/reorder-list.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ContentType } from '../content/entities/content-item.entity';

@Controller('list')
export class ListController {
  constructor(private readonly listService: ListService) {}

  @Get('top')
  getTopByMedian(
    @Query('type') type: ContentType,
    @Query('minReviews') minReviews?: string,
  ) {
    return this.listService.getTopByMedian(type, minReviews ? parseInt(minReviews) : 5);
  }

  @Get(':username/history')
  getHistory(@Param('username') username: string) {
    return this.listService.getHistory(username);
  }

  @Get(':username')
  getUserList(
    @Param('username') username: string,
    @Query('type') type?: ContentType,
    @Query('genre') genre?: string,
    @Query('year') year?: string,
  ) {
    return this.listService.getUserList(username, {
      type,
      genre,
      year: year ? parseInt(year) : undefined,
    });
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  reorder(@CurrentUser() user: User, @Body() dto: ReorderListDto) {
    return this.listService.reorder(user.id, dto);
  }
}
