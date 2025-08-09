import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { copilotkit } from './copilotkit';

export const runtime = 'nodejs';

// Root Hono app under /api
const app = new Hono().basePath('/api');

// Mount the copilotkit router
app.route('/copilotkit', copilotkit);

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
