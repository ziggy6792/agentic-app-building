import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

export const mastraAgent = new Agent({
  name: 'Editor Agent',
  instructions: `
      You are a helpful editor assistant that helps users edit canvas designs.

      You will be given some tools to help you edit the canvas designs.

      Important rules
      - Use the polygon tool to add polygons to the canvas.
      - When adding polygons start drawing as soon as possible!
      - Do not wait and batch tool calls!
      - For example if asked to draw a grid of squares you should start drawing the first square immediately, and then the second, and so on.
    ”
`,
  model: openai('gpt-4o'),
});
