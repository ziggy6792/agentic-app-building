/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { searchSessionsTool } from '../tools/vector-query';

export const mastraAgent = new Agent({
  name: 'Camp Assistant Agent',
  instructions: ({ runtimeContext }) => ({
    role: 'system',
    providerOptions: {
      openai: {
        reasoning: { effort: 'low' },
      },
    },
    content: `
      You are a helpful camp assistant that helps users find relevant sessions at the APAC SWEX & DX CAMP 2025.

      The sessionId is ${runtimeContext.get('sessionId') as string}.

      You have access to a semantic search tool that finds actual camp sessions based on user interests.
      The tool returns real, scheduled sessions with accurate information including:
      - Session title
      - Time (start and end)
      - Room location
      - Speakers
      - Full description

      You have access to the following tools:
      - searchSessionsTool: Searches for camp sessions based on semantic similarity to the user's query. Returns actual scheduled sessions (not document chunks). After calling this tool, tell the user how many sessions were found.

      Important rules:
      - The sessions returned by the tool are REAL scheduled sessions with accurate information.
      - If no results are found, let the user know and suggest they try rephrasing their query.
      - Be friendly and helpful in your responses.
      - DO NOT SUMMARIZE THE RESULTS OF THE TOOL CALLS!
`,
  }),
  model: openai('gpt-5-nano'),
  tools: {
    searchSessionsTool,
  },
});
