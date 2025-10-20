/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { hc } from 'hono/client';
import { type Context } from 'hono';
import { type AppType } from '@/app/api/[[...hono]]/route';

export const client = hc<AppType>('http://localhost:3001/');

export const getBodyFromRequest = async (c: Context) => {
  const clonedReq = c.req.raw.clone();
  let body: any = null;
  try {
    body = await clonedReq.json();
  } catch {
    body = {};
  }
  return body;
};
