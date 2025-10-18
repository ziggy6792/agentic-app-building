import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { PgVector } from "@mastra/pg";

const INDEX_NAME = "documents";

export const vectorQueryTool = createTool({
  id: "query-documents",
  description:
    "Search through the camp schedule and documentation to find relevant information. Use this tool to answer questions about camp sessions, schedules, speakers, or any other information in the documents.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query or question about the documents"),
    topK: z
      .number()
      .optional()
      .default(3)
      .describe("Number of relevant results to return"),
  }),
  execute: async ({ context }) => {
    const { query, topK } = context;

    try {
      // Generate embedding for the query
      const { embeddings } = await embedMany({
        values: [query],
        model: openai.embedding("text-embedding-3-small"),
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
        text: result.metadata?.text ?? "No text available",
        source: result.metadata?.source ?? "Unknown source",
        score: result.score,
      }));

      return {
        query,
        results: formattedResults,
        summary: `Found ${formattedResults.length} relevant document chunks.`,
      };
    } catch (error) {
      console.error("Error querying documents:", error);
      throw new Error(
        `Failed to query documents: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});
