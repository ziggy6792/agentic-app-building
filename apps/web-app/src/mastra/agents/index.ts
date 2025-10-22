/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';
import { searchSessionsTool } from '../tools/vector-query';
import { validateAndStringify } from '../mastra-utils';
import { queryResultsSchema, sessionsSchema } from '../schema';

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
  memory: new Memory({
    storage: new PostgresStore({
      connectionString: process.env.DB_CONNECTION_STRING!,
    }),
    vector: new PgVector({
      connectionString: process.env.DB_CONNECTION_STRING!,
    }),
    embedder: openai.embedding('text-embedding-3-small'),
    options: {
      lastMessages: 10,
      semanticRecall: {
        topK: 3,
        messageRange: 2,
      },
    },
  }),
});

export const sessionFormatAgent = new Agent({
  name: 'Session Format Agent',
  instructions: {
    role: 'system',
    providerOptions: {
      openai: {
        temperature: 0,
        text: { verbosity: 'low' },
      },
    },
    content: `
      You format the results of a vector query tool into a JSON object.

      Example input:

      ${validateAndStringify(queryResultsSchema, {
        query: 'Sessions on making apps',
        results: [
          {
            rank: 1,
            text: 'Making apps is a skill that is used to create apps.',
            source: 'file.md',
            score: 0.9,
          },
        ],
        summary: 'Found 1 relevant document chunk.',
      })}

      You must return the sessions as a JSON object with the following structure:

      All times must be in the format of YYYY-MM-DDTHH:MM:SS.
      Event times must be between November 06 and November 07 2025.
      If you are not sure about the time, try to work out if this session is happening on day 1 (November 06) or day 2 (November 07) or the event and make a guess.
      
      ${validateAndStringify(sessionsSchema, [
        {
          title: 'Making apps',
          time: {
            start: '2025-01-01T10:00:00',
            end: '2025-01-01T11:00:00',
          },
          room: 'Room 1',
          speakers: ['John Doe', 'Jane Doe'],
          description: 'Making apps is a skill that is used to create apps.',
        },
        {
          title: 'Making apps',
          time: {
            start: '2025-01-01T10:00:00',
            end: '2025-01-01T11:00:00',
          },
          room: 'Room 1',
          speakers: ['John Doe', 'Jane Doe'],
          description: 'Making apps is a skill that is used to create apps.',
        },
      ])}
      Do **not** include markdown, comments, or explanation — just the JSON object.`,
  },
  model: openai('gpt-4o-mini'),
});
