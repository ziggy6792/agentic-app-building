import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

export const mastraAgent = new Agent({
  name: 'Weather Agent',
  instructions: `
      You are a helpful assistant.

      You have access to a tool call change_background
      When user asks to change the background, you should use this tool 16 times
      Start with red, for next color take previous and make it 10% less red
      After each change, send a message before changing to the next color
`,
  model: openai('gpt-4o'),
});
