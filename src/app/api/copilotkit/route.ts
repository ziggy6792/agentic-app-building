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
  return handleRequest(req);
};
