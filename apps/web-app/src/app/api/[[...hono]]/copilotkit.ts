import { Hono } from 'hono';
import type { Context } from 'hono';
import { ExperimentalEmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';
import { MastraAgent } from '@ag-ui/mastra';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { mastra } from '@/mastra';
import { getBodyFromRequest } from '@/lib/hono';
import { CustomCopilotRuntime } from '@/lib/CustomCopilotRuntime';

// Prepare CopilotKit runtime with local Mastra agents

// Define a dedicated router for CopilotKit-related endpoints
export const copilotkit = new Hono()
  .get('/messages/:threadId', async (c: Context) => {
    try {
      const threadId = c.req.param('threadId');
      const agent = mastra.getAgent('mastraAgent');

      if (!agent) {
        return c.json({ error: 'Agent not found' }, 404);
      }

      const memory = await agent.getMemory();
      if (!memory) {
        return c.json({ messages: [] });
      }

      const result = await memory.query({
        threadId,
        resourceId: threadId,
        selectBy: {
          last: 50, // Get last 50 messages
        },
      });

      return c.json({ messages: result.messages || [] });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return c.json({ error: 'Failed to fetch messages', messages: [] }, 500);
    }
  })
  .post('/mastra-agent', async (c: Context) => {
    const req: Request = c.req.raw;

    const jsonBody = await getBodyFromRequest(c);

    const runtimeContext = new RuntimeContext();
    const properties = jsonBody?.variables?.properties ?? {};
    if (properties) {
      for (const [key, value] of Object.entries(properties as Record<string, unknown>)) {
        runtimeContext.set(key, value);
      }
    }

    // AG-UI adapter automatically uses threadId as resourceId for memory persistence
    const mastraAgents = MastraAgent.getLocalAgents({
      mastra,
      runtimeContext,
    });

    // Use CustomCopilotRuntime which overrides loadAgentState to return historical messages
    const runtimeInstance = new CustomCopilotRuntime({ agents: mastraAgents });
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime: runtimeInstance,
      serviceAdapter: new ExperimentalEmptyAdapter(),
      endpoint: '/api/copilotkit/mastra-agent',
    });

    return handleRequest(req);
  });
