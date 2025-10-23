import { CopilotRuntime, type CopilotRuntimeConstructorParams, type GraphQLContext } from '@copilotkit/runtime';
import type { Mastra } from '@mastra/core';
import { ConsoleLogger } from '@mastra/core/logger';
import { convertMastraMessagesToAGUI, convertMessagesToLegacyFormat, type MastraMemoryMessage } from './message-converters';

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
  private logger: ConsoleLogger;

  constructor(params?: CopilotRuntimeConstructorParams, mastra?: Mastra) {
    super(params);
    if (!mastra) {
      throw new Error('Mastra instance is required for CustomCopilotRuntime');
    }
    this.mastra = mastra;
    this.logger = new ConsoleLogger({
      name: 'CustomCopilotRuntime',
      level: 'info',
    });
  }

  /**
   * Override loadAgentState to return historical messages from Mastra memory.
   *
   * This method is called by CopilotKit when the page loads to check if there
   * are any existing messages for the current thread.
   */
  async loadAgentState(graphqlContext: GraphQLContext, threadId: string, agentName: string): Promise<LoadAgentStateResponse> {
    this.logger.info('Loading agent state', { threadId, agentName });

    try {
      // Get the agent from Mastra
      const agent = this.mastra.getAgent(agentName);

      if (!agent) {
        this.logger.warn('Agent not found', { agentName });
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
        this.logger.info('No memory configured for agent');
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
        this.logger.info('No messages found for thread', { threadId });
        return {
          threadId,
          threadExists: false,
          state: '{}',
          messages: JSON.stringify([]),
        };
      }

      this.logger.info('Found Mastra messages', { count: result.messages.length });

      // Convert Mastra CoreMessages → AG-UI Messages → CopilotKit Legacy Messages
      const aguiMessages = convertMastraMessagesToAGUI(result.messages as MastraMemoryMessage[]);
      const copilotKitMessages = convertMessagesToLegacyFormat(aguiMessages);

      this.logger.info('Converted to CopilotKit messages', { count: copilotKitMessages.length });
      if (copilotKitMessages.length > 0) {
        this.logger.debug('First message', { message: copilotKitMessages[0] });
      }

      return {
        threadId,
        threadExists: true,
        state: '{}',
        messages: JSON.stringify(copilotKitMessages),
      };
    } catch (error) {
      this.logger.error('Error loading agent state', { error });
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
