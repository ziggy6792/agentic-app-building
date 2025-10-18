import { Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';

import { mastraAgent, sessionFormatAgent } from './agents';

export const mastra = new Mastra({
  agents: { mastraAgent, sessionFormatAgent },
  logger: new ConsoleLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
