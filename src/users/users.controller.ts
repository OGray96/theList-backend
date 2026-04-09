import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('critics')
  async getCritics() {
    const critics = await this.usersService.findCritics();
    return critics.map((u) => this.usersService.sanitize(u));
  }

  @Get()
  @UseGuards(AdminGuard)
  async getAll() {
    const users = await this.usersService.findAll();
    return users.map((u) => this.usersService.sanitize(u));
  }

  @Get(':username/follow-status')
  @UseGuards(JwtAuthGuard)
  async getFollowStatus(
    @Param('username') username: string,
    @CurrentUser() currentUser: User,
  ) {
    const isFollowing = await this.usersService.isFollowing(currentUser.id, username);
    return { isFollowing };
  }

  @Get(':username/following')
  async getFollowing(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    const following = await this.usersService.getFollowing(user.id);
    return following.map((u) => this.usersService.sanitize(u));
  }

  @Get(':username')
  async getProfile(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    return { user: this.usersService.sanitize(user) };
  }

  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async follow(
    @Param('username') username: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.usersService.follow(currentUser.id, username);
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(
    @Param('username') username: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.usersService.unfollow(currentUser.id, username);
  }

  @Patch(':username/critic')
  @UseGuards(AdminGuard)
  async setCritic(
    @Param('username') username: string,
    @Body() body: { isCritic: boolean },
  ) {
    const user = await this.usersService.setCritic(username, body.isCritic);
    return { user: this.usersService.sanitize(user) };
  }
}
