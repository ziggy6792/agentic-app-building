import { Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';
import { PostgresStore } from '@mastra/pg';

import { mastraAgent, sessionFormatAgent } from './agents';

export const mastra = new Mastra({
  agents: { mastraAgent, sessionFormatAgent },
  logger: new ConsoleLogger({
    name: 'Mastra',
    level: 'info',
  }),
  storage: new PostgresStore({
    connectionString: process.env.DB_CONNECTION_STRING!,
  }),
});
