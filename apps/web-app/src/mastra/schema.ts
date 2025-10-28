import z from 'zod';

export const searchSchema = z.object({
  query: z.string().describe('The search query or question about the documents'),
  topK: z.number().optional().default(3).describe('Number of relevant results to return'),
});

export const sessionSchema = z.object({
  title: z.string(),
  time: z
    .object({
      start: z.string().describe('The start time of the session'),
      end: z.string().describe('The end time of the session'),
    })
    .describe('The time of the session'),
  room: z.string(),
  speakers: z.array(z.string()),
  description: z.string(),
});

export const sessionsSchema = z.array(sessionSchema);

export const sessionWithReasonSchema = z.object({
  session: sessionSchema,
  matchReason: z.string().describe('Explanation of why this session matched the user query'),
});

export const sessionsWithReasonsSchema = z.array(sessionWithReasonSchema);

export const formattedResultsSchema = z.array(
  z.object({
    rank: z.number(),
    text: z.string(),
    source: z.string(),
    score: z.number(),
    sessionIndex: z.number().optional(),
    relatedSessionTitle: z.string().optional(),
    relatedSessionIndex: z.number().optional(),
  })
);

export const queryResultsSchema = z.object({
  query: z.string(),
  results: formattedResultsSchema,
  summary: z.string(),
});
