/* eslint-disable no-console */
import { createTool } from '@mastra/core/tools';
import { type z } from 'zod';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PgVector } from '@mastra/pg';
import _ from 'lodash';
import { type queryResultsSchema, searchSchema, sessionsSchema } from '../schema';
import { type sessionExtractionAgent } from '../agents';
import { parseResult } from '../mastra-utils';
import { DOCUMENTS_INDEX_NAME } from '../config';

const SCORE_THRESHOLD = 0.1; // Lowered from 0.2 to be less strict

const searchDocuments = async (context: z.infer<typeof searchSchema>): Promise<z.infer<typeof queryResultsSchema>> => {
  const { query, topK = 15 } = context; // Increased default from 3 to 15

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

    // Query the vector database - search across all documents (PDFs + sessions)
    const results = await vectorStore.query({
      indexName: DOCUMENTS_INDEX_NAME,
      queryVector: queryEmbedding,
      topK: topK * 3, // Get more results to ensure we have enough context (3x multiplier)
    });

    console.log('Vector search results:', JSON.stringify(results, null, 2));

    // Filter by score threshold and format results
    const formattedResults = _.chain(results)
      .filter((result) => result.score > SCORE_THRESHOLD)
      .orderBy((result) => result.score, 'desc')
      .map((result, index) => ({
        rank: index + 1,
        text: result.metadata?.text ?? 'No text available',
        source: result.metadata?.source ?? 'Unknown source',
        score: result.score,
        sessionIndex: result.metadata?.sessionIndex as number | undefined,
        relatedSessionTitle: result.metadata?.relatedSessionTitle as string | undefined,
        relatedSessionIndex: result.metadata?.relatedSessionIndex as number | undefined,
      }))
      .value();

    return {
      query,
      results: formattedResults,
      summary: `Found ${formattedResults.length} relevant document chunks (including PDFs and session data).`,
    };
  } catch (error) {
    console.error('Error querying documents:', error);
    throw new Error(`Failed to query documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const searchSessionsTool = createTool({
  id: 'searchSessionsTool',
  description:
    'Search for camp sessions using rich context from venue information, workshop slides, and session descriptions. Returns actual scheduled sessions that match the user query.',
  inputSchema: searchSchema,
  outputSchema: sessionsSchema,
  execute: async ({ context, mastra, writer }) => {
    const searchTimeA = new Date().getTime();
    const searchResults = await searchDocuments(context);
    const searchTimeB = new Date().getTime();
    console.log(`Time taken to search documents: ${(searchTimeB - searchTimeA) / 1000} seconds`);

    // Use session extraction agent to map document results to actual sessions
    const extractAgent = mastra?.getAgent('sessionExtractionAgent') as typeof sessionExtractionAgent;
    const extractTimeA = new Date().getTime();
    const stream = await extractAgent?.stream(JSON.stringify(searchResults));

    await stream?.textStream?.pipeTo(writer!);

    const extractedSessions = await stream.text;
    const extractTimeB = new Date().getTime();
    console.log(`Time taken to extract sessions: ${(extractTimeB - extractTimeA) / 1000} seconds`);

    console.log('Extracted sessions:', extractedSessions);

    return parseResult(extractedSessions, sessionsSchema);
  },
});
