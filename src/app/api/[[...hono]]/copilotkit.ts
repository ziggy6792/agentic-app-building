import { Hono } from 'hono';
import type { Context } from 'hono';
import { CopilotRuntime, ExperimentalEmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';
import { MastraAgent } from '@ag-ui/mastra';
import { mastra } from '@/mastra';

// Prepare CopilotKit runtime with local Mastra agents
const mastraAgents = MastraAgent.getLocalAgents({ mastra });
const runtimeInstance = new CopilotRuntime({ agents: mastraAgents });
const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  runtime: runtimeInstance,
  serviceAdapter: new ExperimentalEmptyAdapter(),
  endpoint: '/api/copilotkit/mastra-agent',
});

// Define a dedicated router for CopilotKit-related endpoints
export const copilotkit = new Hono().post('/mastra-agent', async (c: Context) => {
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
