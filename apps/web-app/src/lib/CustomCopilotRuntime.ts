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
 * Converts Mastra/Langchain messages to CopilotKit format.
 * Based on CopilotKit's internal langchainMessagesToCopilotKit function.
 */
function mastraMessagesToCopilotKit(messages: any[]): any[] {
  const result: any[] = [];
  const tool_call_names: Record<string, string> = {};

  // First pass: gather all tool call names from AI messages
  for (const message of messages) {
    if (message.type === 'ai') {
      for (const tool_call of message.tool_calls || []) {
        tool_call_names[tool_call.id] = tool_call.name;
      }
    }
  }

  for (const message of messages) {
    let content: any = message.content;
    if (content instanceof Array) {
      content = content[0];
    }
    if (content instanceof Object) {
      content = content.text;
    }

    if (message.type === 'human') {
      result.push({
        role: 'user',
        content: content,
        id: message.id,
      });
    } else if (message.type === 'system') {
      result.push({
        role: 'system',
        content: content,
        id: message.id,
      });
    } else if (message.type === 'ai') {
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const tool_call of message.tool_calls) {
          result.push({
            id: tool_call.id,
            name: tool_call.name,
            arguments: tool_call.args,
            parentMessageId: message.id,
          });
        }
      } else {
        result.push({
          role: 'assistant',
          content: content,
          id: message.id,
          parentMessageId: message.id,
        });
      }
    } else if (message.type === 'tool') {
      const actionName = tool_call_names[message.tool_call_id] || message.name || '';
      result.push({
        actionExecutionId: message.tool_call_id,
        actionName: actionName,
        result: content,
        id: message.id,
      });
    }
  }

  const resultsDict: Record<string, any> = {};
  for (const msg of result) {
    if (msg.actionExecutionId) {
      resultsDict[msg.actionExecutionId] = msg;
    }
  }

  const reorderedResult: any[] = [];

  for (const msg of result) {
    // If it's not a tool result, just append it
    if (!('actionExecutionId' in msg)) {
      reorderedResult.push(msg);
    }

    // If the message has arguments (i.e., is a tool call invocation),
    // append the corresponding result right after it
    if ('arguments' in msg) {
      const msgId = msg.id;
      if (msgId in resultsDict) {
        reorderedResult.push(resultsDict[msgId]);
      }
    }
  }

  return reorderedResult;
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

      // Convert Mastra messages to CopilotKit format
      const copilotKitMessages = mastraMessagesToCopilotKit(result.messages);

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
