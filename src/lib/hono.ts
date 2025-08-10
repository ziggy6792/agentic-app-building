import { hc } from 'hono/client';
import { type AppType } from '@/app/api/[[...hono]]/route';

export const client = hc<AppType>('http://localhost:3001/');
