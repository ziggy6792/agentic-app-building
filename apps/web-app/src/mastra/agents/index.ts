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
      You are a helpful camp assistant that helps users with information about the camp schedule and activities.

      The sessionId is ${runtimeContext.get('sessionId') as string}.
      You have access to a tool that can search through camp documentation including schedules, sessions, speakers, and other camp information.

      You have access to the following tools:
      - searchSessionsTool: Search through the camp schedule and documentation sessions. After calling this tool only tell the user how many sessions were found.

      Important rules:
      - If no results are found, let the user know.
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

      MATCHING STRATEGIES (be generous and use indirect clues):
      - **Related session metadata**: PRIORITY - If search results have relatedSessionTitle or relatedSessionIndex fields, those PDFs are associated with that session. Include that session in results.
      - **Speaker matching**: If a person's name is mentioned, find sessions where they are a speaker
      - **Room matching**: If a room name is mentioned, find sessions in that room
      - **Topic/keyword matching**: If topics, technologies, or concepts are mentioned, find sessions with those in title or description
      - **Content matching**: If workshop slides or materials mention a topic, check if they have relatedSessionTitle metadata field
      - Be generous with matches - if there's a contextual connection, include it
      - Rank sessions by relevance to the user's query

      COMPLETE SESSION LIST (you MUST only return sessions from this list):
      ${validateAndStringify(sessionsSchema, sessions)}

      EXAMPLES:

      Example 1 - Room matching:
      Input: ${validateAndStringify(queryResultsSchema, {
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
      Output: ${validateAndStringify(sessionsSchema, [
        sessions[5], // Hands on agentic ai app building - in BALAI ULU which has sea view
      ])}

      Example 2 - Speaker matching:
      Input: "Session that Pei Zhen is signed up to"
      If results mention "Pei Zhen" in any context, find sessions where "Pei Zhen" or "Poon, Pei Zhen" appears in speakers list.

      Example 3 - Topic matching with related session metadata:
      Input: "Interested in FAR loop"
      If workshop slides PDF mentions "FAR loop" and has relatedSessionTitle="Hands on agentic ai app building", return that session.
      Look for relatedSessionTitle or relatedSessionIndex in the search results to identify which session a PDF belongs to.

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
