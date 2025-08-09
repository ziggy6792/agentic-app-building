import { CopilotRuntime, ExperimentalEmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';

import { MastraAgent } from '@ag-ui/mastra';

import { NextRequest } from 'next/server';
import { mastra } from '@/mastra';

export const POST = async (req: NextRequest) => {
  const mastraAgents = MastraAgent.getLocalAgents({ mastra });

  const runtime = new CopilotRuntime({
    agents: mastraAgents,
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: '/api/copilotkit',
  });

  // Use the original request for handleRequest
  const res = await handleRequest(req);

  // If there's no body, just return as-is
  const body = res.body;
  if (!body) return res;

  // Split the stream so we can log on the server and forward to the client
  const [forwardStream, logStream] = body.tee();

  // Asynchronously read from the logging stream
  (async () => {
    const reader = logStream.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        // Optional: add your logger here instead of console.log
        console.log('[CopilotKit SSE]', text);
      }
    } catch (err) {
      console.error('[CopilotKit SSE] logging error', err);
    } finally {
      reader.releaseLock();
    }
  })();

  // Return a new response with the forwarded stream and original headers/status
  return new Response(forwardStream, {
    status: res.status,
    headers: new Headers(res.headers),
  });
};
