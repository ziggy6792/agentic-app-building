import { createTool } from '@mastra/core/tools';
import { type z } from 'zod';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { LibSQLVector } from '@mastra/libsql';
import { type queryResultsSchema, searchSchema, sessionsSchema } from '../schema';
import { type sessionFormatAgent } from '../agents';
import { parseResult } from '../mastra-utils';

const INDEX_NAME = 'documents';

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
    const vectorStore = new LibSQLVector({
      connectionUrl: 'file:./data/vectors.db',
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
      results: formattedResults,
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
    const result = await searchDocuments(context);

    const formatAgent = mastra?.getAgent('sessionFormatAgent') as typeof sessionFormatAgent;
    const stream = await formatAgent?.stream(JSON.stringify(result));

    await stream?.textStream?.pipeTo(writer!);

    const formattedResult = await stream.text;

    return parseResult(formattedResult, sessionsSchema);
  },
});
