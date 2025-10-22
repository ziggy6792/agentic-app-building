import { CopilotRuntime, type CopilotRuntimeConstructorParams, type GraphQLContext } from '@copilotkit/runtime';

// Define the LoadAgentStateResponse type to match CopilotKit's internal structure
interface LoadAgentStateResponse {
  threadId: string;
  threadExists: boolean;
  state: string;
  messages: string; // JSON stringified array of messages
}

/**
 * Custom CopilotRuntime that extends the base CopilotRuntime to provide
 * historical message loading for Mastra agents.
 *
 * This addresses the limitation in CopilotKit where loadAgentState doesn't
 * work with Mastra agents (GitHub issue #1881).
 */
export class CustomCopilotRuntime extends CopilotRuntime {
  constructor(params?: CopilotRuntimeConstructorParams) {
    super(params);
  }

  /**
   * Override loadAgentState to return historical messages from Mastra memory.
   *
   * This method is called by CopilotKit when the page loads to check if there
   * are any existing messages for the current thread.
   */
  async loadAgentState(
    graphqlContext: GraphQLContext,
    threadId: string,
    agentName: string
  ): Promise<LoadAgentStateResponse> {
    console.log('[CustomCopilotRuntime] Loading agent state for:', { threadId, agentName });

    // For now, return mocked message to test the architecture
    // TODO: Replace with actual Mastra memory queries
    const mockedMessages = [
      {
        __typename: 'TextMessageOutput',
        id: 'mock-message-1',
        createdAt: new Date().toISOString(),
        role: 'user',
        content: 'hello world',
        parentMessageId: null,
        status: {
          __typename: 'SuccessMessageStatus',
          code: 'success',
        },
      },
    ];

    console.log('[CustomCopilotRuntime] Returning mocked message');

    return {
      threadId,
      threadExists: true,
      state: '{}',
      messages: JSON.stringify(mockedMessages),
    };
  }
}
