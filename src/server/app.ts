import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { CopilotRuntime } from '@copilotkit/runtime';
import { MastraAgent } from '@ag-ui/mastra';
import { mastra } from '@/mastra';

// Build runtime once
const mastraAgents = MastraAgent.getLocalAgents({ mastra });
const runtime = new CopilotRuntime({ agents: mastraAgents });

const app = new Hono();

app.post('/api/copilotkit', async (c) => {
  // Forward the incoming request to CopilotKit runtime
  const res = await runtime.handleRequest(c.req.raw);

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
        console.log('[Hono CopilotKit SSE]', text);
      }
    } catch (err) {
      console.error('[Hono CopilotKit SSE] logging error', err);
    } finally {
      reader.releaseLock();
    }
  })();

  return new Response(forwardStream, { status: res.status, headers: res.headers });
});

const port = Number(process.env.PORT || 3001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Hono server listening on http://localhost:${info.port}`);
});
