import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { copilotkit } from './copilotkit';

export const runtime = 'nodejs';

// Root Hono app under /api, chain the routes on the same instance for proper RPC typing
const app = new Hono().basePath('/api').route('/copilotkit', copilotkit);

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);

export type AppType = typeof app;
