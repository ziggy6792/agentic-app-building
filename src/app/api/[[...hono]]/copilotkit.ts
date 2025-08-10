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

  return handleRequest(req);
});
