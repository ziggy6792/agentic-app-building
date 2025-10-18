import { type FC } from 'react';
import type z from 'zod';
import { type searchSchema, type sessionsSchema } from '@/mastra/schema';

type SearchSessionsRenderProps = {
  args: z.infer<typeof searchSchema>;
  result: z.infer<typeof sessionsSchema>;
};

export const SessionsWidget: FC<SearchSessionsRenderProps> = ({ args, result }) => (
  <>
    <div>result: {JSON.stringify(result)}</div>
    <div>args: {JSON.stringify(args)}</div>
  </>
);
