import { Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';

import { mastraAgent, sessionExtractionAgent } from './agents';

export const mastra = new Mastra({
  agents: { mastraAgent, sessionExtractionAgent },
  logger: new ConsoleLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
