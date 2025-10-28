import { Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';

import { mastraAgent } from './agents';

export const mastra = new Mastra({
  agents: { mastraAgent },
  logger: new ConsoleLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
