import { CopilotRuntime, type CopilotRuntimeConstructorParams, type GraphQLContext } from '@copilotkit/runtime';
import type { Mastra } from '@mastra/core';

// Define the LoadAgentStateResponse type to match CopilotKit's internal structure
interface LoadAgentStateResponse {
  threadId: string;
  threadExists: boolean;
  state: string;
  messages: string; // JSON stringified array of messages
}

// AG-UI Message types (from @ag-ui/core)
interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface AGUIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

// CopilotKit Legacy Message types (from AG-UI client legacy converter)
interface LegacyTextMessage {
  id: string;
  role: string;
  content: string;
  parentMessageId?: string;
}

interface LegacyActionExecutionMessage {
  id: string;
  name: string;
  arguments: any;
  parentMessageId?: string;
}

interface LegacyResultMessage {
  id: string;
  result: any;
  actionExecutionId: string;
  actionName: string;
}

type LegacyMessage = LegacyTextMessage | LegacyActionExecutionMessage | LegacyResultMessage;

/**
 * Convert Mastra CoreMessage to AG-UI Message format.
 * This is the inverse of convertAGUIMessagesToMastra from @ag-ui/mastra.
 */
function convertMastraMessagesToAGUI(mastraMessages: any[]): AGUIMessage[] {
  const result: AGUIMessage[] = [];

  for (const msg of mastraMessages) {
    if (msg.role === 'user') {
      result.push({
        id: msg.id,
        role: 'user',
        content: msg.content,
      });
    } else if (msg.role === 'assistant') {
      const content = Array.isArray(msg.content)
        ? msg.content.find((p: any) => p.type === 'text')?.text
        : msg.content;

      const toolCalls: ToolCall[] = Array.isArray(msg.content)
        ? msg.content
            .filter((p: any) => p.type === 'tool-call')
            .map((p: any) => ({
              id: p.toolCallId,
              type: 'function' as const,
              function: {
                name: p.toolName,
                arguments: JSON.stringify(p.args),
              },
            }))
        : [];

      result.push({
        id: msg.id,
        role: 'assistant',
        content,
        ...(toolCalls.length > 0 ? { toolCalls } : {}),
      });
    } else if (msg.role === 'tool') {
      const toolResults = Array.isArray(msg.content) ? msg.content : [];
      for (const tr of toolResults) {
        if (tr.type === 'tool-result') {
          result.push({
            id: msg.id,
            role: 'tool',
            content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result),
            toolCallId: tr.toolCallId,
          });
        }
      }
    } else if (msg.role === 'system') {
      result.push({
        id: msg.id,
        role: 'system',
        content: msg.content,
      });
    }
  }

  return result;
}

/**
 * Convert AG-UI Messages to CopilotKit legacy format.
 * This function is copied from @ag-ui/client's convertMessagesToLegacyFormat.
 */
function convertMessagesToLegacyFormat(messages: AGUIMessage[]): LegacyMessage[] {
  const result: LegacyMessage[] = [];

  for (const message of messages) {
    if (message.role === 'assistant' || message.role === 'user' || message.role === 'system') {
      if (message.content) {
        const textMessage: LegacyTextMessage = {
          id: message.id,
          role: message.role,
          content: message.content,
        };
        result.push(textMessage);
      }
      if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
        for (const toolCall of message.toolCalls) {
          const actionExecutionMessage: LegacyActionExecutionMessage = {
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
            parentMessageId: message.id,
          };
          result.push(actionExecutionMessage);
        }
      }
    } else if (message.role === 'tool') {
      let actionName = 'unknown';
      for (const m of messages) {
        if (m.role === 'assistant' && m.toolCalls?.length) {
          for (const toolCall of m.toolCalls) {
            if (toolCall.id === message.toolCallId) {
              actionName = toolCall.function.name;
              break;
            }
          }
        }
      }
      const toolMessage: LegacyResultMessage = {
        id: message.id,
        result: message.content,
        actionExecutionId: message.toolCallId!,
        actionName,
      };
      result.push(toolMessage);
    }
  }

  return result;
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

      console.log('[CustomCopilotRuntime] Found', result.messages.length, 'Mastra messages');

      // Convert Mastra CoreMessages → AG-UI Messages → CopilotKit Legacy Messages
      const aguiMessages = convertMastraMessagesToAGUI(result.messages);
      const copilotKitMessages = convertMessagesToLegacyFormat(aguiMessages);

      console.log('[CustomCopilotRuntime] Converted to', copilotKitMessages.length, 'CopilotKit messages');
      if (copilotKitMessages.length > 0) {
        console.log('[CustomCopilotRuntime] First message:', JSON.stringify(copilotKitMessages[0], null, 2));
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
