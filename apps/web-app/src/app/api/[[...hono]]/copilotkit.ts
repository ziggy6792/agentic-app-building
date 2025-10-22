import { Hono } from 'hono';
import type { Context } from 'hono';
import { CopilotRuntime, ExperimentalEmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';
import { MastraAgent } from '@ag-ui/mastra';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { mastra } from '@/mastra';
import { getBodyFromRequest } from '@/lib/hono';

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

    // Inject mocked historical message for testing
    if (jsonBody?.variables?.data?.messages) {
      const messages = jsonBody.variables.data.messages;
      console.log('[CopilotKit] Original message count:', messages.length);

      // Create a mocked historical message
      const mockedMessage = {
        id: 'ck-historical-mock-1',
        createdAt: new Date().toISOString(),
        textMessage: {
          content: 'hello world',
          role: 'user',
        },
      };

      // Find the system message (usually first) and insert mock message after it
      const systemMessageIndex = messages.findIndex((msg: any) => msg.textMessage?.role === 'system');
      if (systemMessageIndex !== -1) {
        messages.splice(systemMessageIndex + 1, 0, mockedMessage);
        console.log('[CopilotKit] Injected mocked message at index', systemMessageIndex + 1);
        console.log('[CopilotKit] New message count:', messages.length);
      }
    }

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
    const runtimeInstance = new CopilotRuntime({ agents: mastraAgents });
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime: runtimeInstance,
      serviceAdapter: new ExperimentalEmptyAdapter(),
      endpoint: '/api/copilotkit/mastra-agent',
    });

    // Create a new Request with the modified body
    const modifiedReq = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(jsonBody),
    });

    return handleRequest(modifiedReq);
  });
