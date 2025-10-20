import { Hono } from 'hono';
import type { Context } from 'hono';
import { CopilotRuntime, ExperimentalEmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';
import { MastraAgent } from '@ag-ui/mastra';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { mastra } from '@/mastra';
import { getBodyFromRequest } from '@/lib/hono';

// Prepare CopilotKit runtime with local Mastra agents

// Define a dedicated router for CopilotKit-related endpoints
export const copilotkit = new Hono().post('/mastra-agent', async (c: Context) => {
  const req: Request = c.req.raw;

  const jsonBody = await getBodyFromRequest(c);

  const runtimeContext = new RuntimeContext();
  const properties = jsonBody?.variables?.properties ?? {};
  if (properties) {
    for (const [key, value] of Object.entries(properties as Record<string, unknown>)) {
      runtimeContext.set(key, value);
    }
  }

  const mastraAgents = MastraAgent.getLocalAgents({
    mastra,
    runtimeContext,
  });
  const runtimeInstance = new CopilotRuntime({ agents: mastraAgents });
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: runtimeInstance,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: '/api/copilotkit/mastra-agent',
  });

  return handleRequest(req);
});
