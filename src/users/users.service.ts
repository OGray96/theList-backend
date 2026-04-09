import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Follow } from './entities/follow.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Follow)
    private readonly followsRepo: Repository<Follow>,
  ) {}

  async findByUsername(username: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findCritics(): Promise<User[]> {
    return this.usersRepo.find({
      where: { isCritic: true },
      order: { displayName: 'ASC' },
    });
  }

  findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  async setCritic(username: string, isCritic: boolean): Promise<User> {
    const user = await this.findByUsername(username);
    user.isCritic = isCritic;
    return this.usersRepo.save(user);
  }

  async follow(followerId: string, targetUsername: string): Promise<void> {
    const target = await this.findByUsername(targetUsername);
    if (target.id === followerId) return;
    const follow = this.followsRepo.create({ followerId, followingId: target.id });
    await this.followsRepo.save(follow).catch(() => {});
  }

  async unfollow(followerId: string, targetUsername: string): Promise<void> {
    const target = await this.findByUsername(targetUsername);
    await this.followsRepo.delete({ followerId, followingId: target.id });
  }

  async isFollowing(followerId: string, targetUsername: string): Promise<boolean> {
    const target = await this.findByUsername(targetUsername);
    const count = await this.followsRepo.count({
      where: { followerId, followingId: target.id },
    });
    return count > 0;
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const follows = await this.followsRepo.find({
      where: { followerId: userId },
      select: ['followingId'],
    });
    return follows.map((f) => f.followingId);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const follows = await this.followsRepo.find({
      where: { followerId: userId },
      relations: ['following'],
    });
    return follows.map((f) => f.following);
  }

  sanitize(user: User) {
    const { passwordHash, email, ...rest } = user as any;
    return rest;
  }
}
