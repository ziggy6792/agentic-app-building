import z from 'zod';

export const searchSchema = z.object({
  query: z.string().describe('The search query or question about the documents'),
  topK: z.number().optional().default(3).describe('Number of relevant results to return'),
});

export const sessionsSchema = z.array(
  z.object({
    title: z.string(),
    time: z.string(),
    room: z.string(),
    speakers: z.array(z.string()),
    description: z.string(),
  })
);

export const formattedResultsSchema = z.array(
  z.object({
    rank: z.number(),
    text: z.string(),
    source: z.string(),
    score: z.number(),
  })
);

export const queryResultsSchema = z.object({
  query: z.string(),
  results: formattedResultsSchema,
  summary: z.string(),
});
