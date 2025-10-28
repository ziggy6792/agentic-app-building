/* eslint-disable no-console */
import { createTool } from '@mastra/core/tools';
import { type z } from 'zod';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PgVector } from '@mastra/pg';
import _ from 'lodash';
import { searchSchema, sessionsSchema } from '../schema';
import { sessions } from '@/data/sessions';

const INDEX_NAME = 'session_embeddings';

const SCORE_THRESHOLD = 0.2;

const searchSessions = async (context: z.infer<typeof searchSchema>): Promise<z.infer<typeof sessionsSchema>> => {
  const { query, topK } = context;

  try {
    // Generate embedding for the query
    const { embeddings } = await embedMany({
      values: [query],
      model: openai.embedding('text-embedding-3-small'),
    });
    const queryEmbedding = embeddings[0];

    // Initialize vector store
    const vectorStore = new PgVector({
      connectionString: process.env.DB_CONNECTION_STRING!,
    });

    // Query the vector database
    const results = await vectorStore.query({
      indexName: INDEX_NAME,
      queryVector: queryEmbedding,
      topK,
    });

    console.log('Results:', JSON.stringify(results, null, 2));

    // Filter by score threshold and extract session objects
    const matchedSessions = _.chain(results)
      .filter((result) => result.score > SCORE_THRESHOLD)
      .orderBy((result) => result.score as number, 'desc')
      .map((result) => {
        const sessionIndex = result.metadata?.sessionIndex as number;
        return sessions[sessionIndex];
      })
      .filter((session) => session !== undefined)
      .value();

    console.log(`Found ${matchedSessions.length} matching sessions for query: "${query}"`);

    console.log('Matched sessions:', JSON.stringify(matchedSessions, null, 2));

    return matchedSessions as z.infer<typeof sessionsSchema>;
  } catch (error) {
    console.error('Error querying sessions:', error);
    throw new Error(`Failed to query sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const searchSessionsTool = createTool({
  id: 'searchSessionsTool',
  description:
    'Search for camp sessions based on user interests and requirements. Returns actual scheduled sessions with times, rooms, speakers, and descriptions.',
  inputSchema: searchSchema,
  outputSchema: sessionsSchema,
  execute: async ({ context }) => {
    const timeA = new Date().getTime();
    const result = await searchSessions(context);
    const timeB = new Date().getTime();
    console.log(`Time taken to search sessions: ${(timeB - timeA) / 1000} seconds`);

    return result;
  },
});
