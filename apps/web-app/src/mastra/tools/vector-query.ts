/* eslint-disable no-console */
import { createTool } from '@mastra/core/tools';
import { type z } from 'zod';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PgVector } from '@mastra/pg';
import { type queryResultsSchema, searchSchema, sessionsSchema } from '../schema';
import { type sessionFormatAgent } from '../agents';
import { parseResult } from '../mastra-utils';

const INDEX_NAME = 'documents';

const SCORE_THRESHOLD = 0.2;

const searchDocuments = async (context: z.infer<typeof searchSchema>): Promise<z.infer<typeof queryResultsSchema>> => {
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

    // Format results for the agent
    const formattedResults = results.map((result, index) => ({
      rank: index + 1,
      text: result.metadata?.text ?? 'No text available',
      source: result.metadata?.source ?? 'Unknown source',
      score: result.score,
    }));

    return {
      query,
      results: formattedResults.filter((result) => result.score > SCORE_THRESHOLD),
      summary: `Found ${formattedResults.length} relevant document chunks.`,
    };
  } catch (error) {
    console.error('Error querying documents:', error);
    throw new Error(`Failed to query documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const searchSessionsTool = createTool({
  id: 'searchSessionsTool',
  description: 'Fetches the current weather information for a given city',
  inputSchema: searchSchema,
  outputSchema: sessionsSchema,
  execute: async ({ context, mastra, writer }) => {
    const searchDocumentsTimeA = new Date().getTime();
    const result = await searchDocuments(context);
    const searchDocumentsTimeB = new Date().getTime();
    console.log(`Time taken to search documents: ${(searchDocumentsTimeB - searchDocumentsTimeA) / 1000} seconds`);
    console.log(`result: ${JSON.stringify(result)}`);

    const formatAgent = mastra?.getAgent('sessionFormatAgent') as typeof sessionFormatAgent;
    const timeA = new Date().getTime();
    const stream = await formatAgent?.stream(JSON.stringify(result));

    await stream?.textStream?.pipeTo(writer!);

    const formattedResult = await stream.text;
    const timeB = new Date().getTime();
    console.log(`Time taken to format result: ${(timeB - timeA) / 1000} seconds`);

    return parseResult(formattedResult, sessionsSchema);
  },
});
