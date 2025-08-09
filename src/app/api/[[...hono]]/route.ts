import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import type { Context } from 'hono';
import { CopilotRuntime, ExperimentalEmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';
import { MastraAgent } from '@ag-ui/mastra';
import { mastra } from '@/mastra';

export const runtime = 'nodejs';

// Build Hono app with basePath /api
const app = new Hono().basePath('/api');

// Prepare CopilotKit runtime with local Mastra agents
const mastraAgents = MastraAgent.getLocalAgents({ mastra });
const runtimeInstance = new CopilotRuntime({ agents: mastraAgents });
const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  runtime: runtimeInstance,
  serviceAdapter: new ExperimentalEmptyAdapter(),
  endpoint: '/api/copilotkit',
});

app.post('/copilotkit', async (c: Context) => {
  const req: Request = c.req.raw;
  const res = await handleRequest(req);

  const body = res.body;
  if (!body) {
    return new Response(null, { status: res.status, headers: res.headers });
  }

  const [forwardStream, logStream] = body.tee();

  (async () => {
    const reader = logStream.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        console.log('[Hono/Next CopilotKit SSE]', text);
      }
    } catch (err) {
      console.error('[Hono/Next CopilotKit SSE] logging error', err);
    } finally {
      reader.releaseLock();
    }
  })();

  return new Response(forwardStream, { status: res.status, headers: res.headers });
});

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
