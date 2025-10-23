import { Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';
import { PostgresStore } from '@mastra/pg';

import { mastraAgent, sessionFormatAgent } from './agents';
import { getStorage } from './storage';

export const mastra = new Mastra({
  agents: { mastraAgent, sessionFormatAgent },
  logger: new ConsoleLogger({
    name: 'Mastra',
    level: 'info',
  }),
  storage: getStorage(),
});
