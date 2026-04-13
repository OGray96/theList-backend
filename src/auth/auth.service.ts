import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const existingUser = await this.usersRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existingUser) {
      throw new ConflictException('Email or username already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = randomUUID();

    const user = this.usersRepo.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      displayName: dto.username,
      emailVerificationToken: verificationToken,
      isEmailVerified: false,
    });

    const saved = await this.usersRepo.save(user);
    await this.sendVerificationEmail(dto.email, dto.username, verificationToken);
    return saved;
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.usersRepo.findOne({
      where: { emailVerificationToken: token },
    });
    if (!user) throw new BadRequestException('Invalid or expired verification token');
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    await this.usersRepo.save(user);
  }

  async login(dto: LoginDto): Promise<{ user: User; token: string }> {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('No account found with that email address');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Incorrect password');

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });

    return { user, token };
  }

  private async sendVerificationEmail(
    email: string,
    username: string,
    token: string,
  ): Promise<void> {
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;

    if (!process.env.SMTP_HOST) {
      // No SMTP configured — auto-verify in development
      await this.usersRepo.update(
        { emailVerificationToken: token },
        { isEmailVerified: true, emailVerificationToken: null },
      );
      console.log(`[DEV] Email verification skipped for ${email}. Would send: ${url}`);
      return;
    }

    // SMTP is configured — send real email via nodemailer
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"theList" <noreply@thelist.app>`,
        to: email,
        subject: 'Verify your theList account',
        html: `
          <p>Hi ${username},</p>
          <p>Click the link below to verify your email address:</p>
          <p><a href="${url}">${url}</a></p>
          <p>This link expires in 24 hours.</p>
        `,
      });
    } catch (err) {
      console.error('Failed to send verification email:', err);
    }
  }

  sanitizeUser(user: User) {
    const { passwordHash, emailVerificationToken, ...rest } = user as any;
    return rest;
  }
}
