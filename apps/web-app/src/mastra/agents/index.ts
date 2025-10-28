/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { searchSessionsTool } from '../tools/vector-query';
import { validateAndStringify } from '../mastra-utils';
import { queryResultsSchema, sessionsSchema } from '../schema';
import { sessions } from '@/data/sessions';

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
      - searchSessionsTool: Searches for camp sessions using rich context from venue information, workshop slides, and session descriptions. Returns actual scheduled sessions that match the user query. After calling this tool, tell the user how many sessions were found.

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

export const sessionExtractionAgent = new Agent({
  name: 'Session Extraction Agent',
  instructions: {
    role: 'system',
    providerOptions: {
      openai: {
        temperature: 0,
        text: { verbosity: 'low' },
      },
    },
    content: `
      You are a session extraction agent that analyzes vector search results and returns ONLY actual sessions from the provided session list.

      You will receive:
      1. A query from the user
      2. Vector search results that may include:
         - Direct session matches
         - Venue information (room layouts, locations)
         - Workshop slides and content
         - Other camp documentation

      Your task:
      - Analyze the search results to understand what the user is looking for
      - Match the context to ACTUAL sessions from the complete session list below
      - Return ONLY sessions that exist in the provided list
      - DO NOT hallucinate or create new sessions
      - If results mention room names, match them to sessions in those rooms
      - If results mention topics/keywords, match them to session descriptions
      - Rank sessions by relevance to the user's query

      COMPLETE SESSION LIST (you MUST only return sessions from this list):
      ${validateAndStringify(sessionsSchema, sessions)}

      Example input:
      ${validateAndStringify(queryResultsSchema, {
        query: 'sessions with a sea view',
        results: [
          {
            rank: 1,
            text: 'BALAI ULU room has a beautiful sea view overlooking the beach',
            source: 'Venue Information.pdf',
            score: 0.9,
          },
          {
            rank: 2,
            text: 'Session: Hands on agentic ai app building\nTime: 2025-11-06 13:30 to 2025-11-06 17:30\nRoom: BALAI ULU',
            source: 'sessions.ts',
            score: 0.85,
            sessionIndex: 5,
          },
        ],
        summary: 'Found 2 relevant chunks',
      })}

      Example output (return ONLY the JSON array, no markdown or explanation):
      ${validateAndStringify(sessionsSchema, [
        sessions[5], // Hands on agentic ai app building - in BALAI ULU which has sea view
      ])}

      CRITICAL RULES:
      - Return ONLY sessions that exist in the complete session list above
      - Return an empty array [] if no sessions match
      - Do NOT create or modify session information
      - Return the sessions exactly as they appear in the list
      - Do **not** include markdown, comments, or explanation — just the JSON array
`,
  },
  model: openai('gpt-4o-mini'),
});
