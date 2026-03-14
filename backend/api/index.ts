import 'tsconfig-paths/register';
import 'dotenv/config';
import type { Application } from 'express';
import { createApp } from '../src/app-bootstrap';

let handlerPromise: Promise<Application> | null = null;

async function getHandler(): Promise<Application> {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as Application;
}

function sendError(
  res: import('express').Response,
  status: number,
  message: string,
) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}

export default async function handler(
  req: import('express').Request,
  res: import('express').Response,
) {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    sendError(res, 503, 'Server misconfigured: DATABASE_URL missing');
    return;
  }

  try {
    if (!handlerPromise) {
      handlerPromise = getHandler();
    }
    const expressApp = await handlerPromise;
    expressApp(req, res);
  } catch (err) {
    console.error('Serverless handler error:', err);
    const message =
      err instanceof Error ? err.message : 'Internal server error';
    sendError(res, 500, message);
  }
}
