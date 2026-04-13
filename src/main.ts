import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('[BOOT] Starting bootstrap...');
  console.log('[BOOT] NODE_ENV:', process.env.NODE_ENV);
  console.log('[BOOT] PORT:', process.env.PORT);
  console.log('[BOOT] DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('[BOOT] FRONTEND_URL:', process.env.FRONTEND_URL);

  let app;
  try {
    console.log('[BOOT] Creating NestFactory...');
    app = await NestFactory.create(AppModule);
    console.log('[BOOT] NestFactory created successfully');
  } catch (err) {
    console.error('[BOOT] FATAL: NestFactory.create failed:', err);
    process.exit(1);
  }

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  console.log(`[BOOT] Attempting to listen on 0.0.0.0:${port}...`);

  try {
    await app.listen(port, '0.0.0.0');
    console.log(`[BOOT] Successfully listening on http://0.0.0.0:${port}`);
  } catch (err) {
    console.error('[BOOT] FATAL: Failed to bind port:', err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('[BOOT] FATAL: Unhandled bootstrap error:', err);
  process.exit(1);
});
