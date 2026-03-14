import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
    }),
  );

  const allowedOrigins = [
    'https://pooja-dairy-noida.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  if (process.env.CORS_ORIGIN) {
    allowedOrigins.push(
      ...process.env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    );
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  return app;
}
