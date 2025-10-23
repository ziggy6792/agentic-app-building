// Mastra Memory Message type (what's actually returned from memory.query())
// This includes the CoreMessage fields plus metadata fields added by Mastra
export interface MastraMemoryMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | any[];
  createdAt?: string;
  threadId?: string;
  resourceId?: string;
  type?: string;
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

export type LegacyMessage = LegacyTextMessage | LegacyActionExecutionMessage | LegacyResultMessage;

/**
 * Converts Mastra Memory Message format to AG-UI Message format.
 *
 * This is the inverse of convertAGUIMessagesToMastra from @ag-ui/mastra.
 *
 * Mastra Memory Message format includes:
 * - Text messages: { role, content, id, type: "text", ... }
 * - Assistant with tool calls: { role: "assistant", content: [{ type: "text", text }, { type: "tool-call", ... }], id }
 * - Tool results: { role: "tool", content: [{ type: "tool-result", ... }], id }
 *
 * AG-UI Message format:
 * - User/System: { id, role, content }
 * - Assistant: { id, role, content?, toolCalls?: [...] }
 * - Tool: { id, role: "tool", content, toolCallId }
 *
 * @param mastraMessages - Array of Mastra Memory Message objects from memory.query()
 * @returns Array of AG-UI compatible messages
 */
export function convertMastraMessagesToAGUI(mastraMessages: MastraMemoryMessage[]): AGUIMessage[] {
  const result: AGUIMessage[] = [];

  for (const msg of mastraMessages) {
    if (msg.role === 'user') {
      result.push({
        id: msg.id,
        role: 'user',
        content: msg.content as string,
      });
    } else if (msg.role === 'assistant') {
      const content = Array.isArray(msg.content) ? msg.content.find((p: any) => p.type === 'text')?.text : msg.content;

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
        content: msg.content as string,
      });
    }
  }

  return result;
}

/**
 * Converts AG-UI Messages to CopilotKit legacy format.
 *
 * This function is copied from convertMessagesToLegacyFormat from @ag-ui/client.
 *
 * AG-UI Message format:
 * - Text messages: { id, role, content }
 * - Assistant with tools: { id, role: "assistant", toolCalls: [...] }
 * - Tool results: { id, role: "tool", content, toolCallId }
 *
 * CopilotKit Legacy format flattens the structure:
 * - Text messages: { id, role, content }
 * - Tool calls: { id, name, arguments, parentMessageId }
 * - Tool results: { id, result, actionExecutionId, actionName }
 *
 * @param messages - Array of AG-UI Message objects
 * @returns Array of CopilotKit legacy format messages
 */
export function convertMessagesToLegacyFormat(messages: AGUIMessage[]): LegacyMessage[] {
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
