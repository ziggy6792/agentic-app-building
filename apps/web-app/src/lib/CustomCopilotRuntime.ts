import { CopilotRuntime, type CopilotRuntimeConstructorParams, type GraphQLContext } from '@copilotkit/runtime';
import type { Mastra } from '@mastra/core';

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
  private mastra: Mastra;

  constructor(params?: CopilotRuntimeConstructorParams, mastra?: Mastra) {
    super(params);
    if (!mastra) {
      throw new Error('Mastra instance is required for CustomCopilotRuntime');
    }
    this.mastra = mastra;
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

    try {
      // Get the agent from Mastra
      const agent = this.mastra.getAgent(agentName);

      if (!agent) {
        console.warn('[CustomCopilotRuntime] Agent not found:', agentName);
        return {
          threadId,
          threadExists: false,
          state: '{}',
          messages: JSON.stringify([]),
        };
      }

      // Get the agent's memory
      const memory = await agent.getMemory();

      if (!memory) {
        console.log('[CustomCopilotRuntime] No memory configured for agent');
        return {
          threadId,
          threadExists: false,
          state: '{}',
          messages: JSON.stringify([]),
        };
      }

      // Query messages from Mastra memory
      const result = await memory.query({
        threadId,
        resourceId: threadId,
        selectBy: {
          last: 50, // Get last 50 messages
        },
      });

      if (!result.messages || result.messages.length === 0) {
        console.log('[CustomCopilotRuntime] No messages found for thread:', threadId);
        return {
          threadId,
          threadExists: false,
          state: '{}',
          messages: JSON.stringify([]),
        };
      }

      console.log('[CustomCopilotRuntime] Found', result.messages.length, 'messages');
      console.log('[CustomCopilotRuntime] First message sample:', JSON.stringify(result.messages[0], null, 2));

      // Convert Mastra CoreMessage format to CopilotKit's expected format
      // Mastra includes extra fields (createdAt, resourceId, threadId, type) that need to be filtered out
      const copilotKitMessages = result.messages.map((msg: any) => {
        // Handle text messages (user, assistant, system)
        if (msg.type === 'text') {
          return {
            role: msg.role,
            content: msg.content,
            id: msg.id,
          };
        }

        // Handle tool-call messages
        if (msg.type === 'tool-call' && Array.isArray(msg.content)) {
          const toolCalls = msg.content
            .filter((item: any) => item.type === 'tool-call')
            .map((item: any) => ({
              id: item.toolCallId,
              name: item.toolName,
              arguments: item.args,
              parentMessageId: msg.id,
            }));
          return toolCalls;
        }

        // Handle tool-result messages
        if (msg.type === 'tool-result' && Array.isArray(msg.content)) {
          const results = msg.content
            .filter((item: any) => item.type === 'tool-result')
            .map((item: any) => ({
              actionExecutionId: item.toolCallId,
              actionName: item.toolName,
              result: item.result,
              id: msg.id,
            }));
          return results;
        }

        // Fallback for unexpected formats
        console.warn('[CustomCopilotRuntime] Unknown message type:', msg.type);
        return null;
      }).flat().filter((msg: any) => msg !== null);

      console.log('[CustomCopilotRuntime] Converted to', copilotKitMessages.length, 'CopilotKit messages');
      if (copilotKitMessages.length > 0) {
        console.log('[CustomCopilotRuntime] First converted message:', JSON.stringify(copilotKitMessages[0], null, 2));
      }

      return {
        threadId,
        threadExists: true,
        state: '{}',
        messages: JSON.stringify(copilotKitMessages),
      };
    } catch (error) {
      console.error('[CustomCopilotRuntime] Error loading agent state:', error);
      // Return empty state on error to prevent breaking the UI
      return {
        threadId,
        threadExists: false,
        state: '{}',
        messages: JSON.stringify([]),
      };
    }
  }
}
