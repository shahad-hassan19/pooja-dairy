import 'dotenv/config';
import type { Application } from 'express';
import { createApp } from '../src/app-bootstrap';

let handlerPromise: Promise<Application> | null = null;

async function getHandler(): Promise<Application> {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as Application;
}

export default async function handler(
  req: import('express').Request,
  res: import('express').Response,
) {
  if (!handlerPromise) {
    handlerPromise = getHandler();
  }
  const expressApp = await handlerPromise;
  expressApp(req, res);
}
