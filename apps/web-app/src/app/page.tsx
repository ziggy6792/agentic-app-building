'use client';
import React, { useState } from 'react';
import '@copilotkit/react-ui/styles.css';
import './globals.css';
import { CopilotKit, useCopilotAction } from '@copilotkit/react-core';
import { CopilotChat } from '@copilotkit/react-ui';
import type z from 'zod';
import { client } from '@/lib/hono';
import { type sessionsSchema } from '@/mastra/schema';
import { CompactSessionsWidget } from '@/components/compact-sessions-widget';

const MastraChat: React.FC = () => (
  <CopilotKit runtimeUrl={client.api.copilotkit['mastra-agent'].$url().pathname} showDevConsole={false} agent='mastraAgent'>
    <Chat />
  </CopilotKit>
);

const Chat = () => {
  const [background] = useState<string>('black');

  useCopilotAction(
    {
      name: 'searchSessionsTool',
      available: 'frontend',
      render: ({ args, result }) => <CompactSessionsWidget query={args.query} results={result as z.infer<typeof sessionsSchema>} />,
      followUp: false,
    },
    []
  );

  return (
    <div className='flex justify-center items-center h-full w-full' style={{ background }}>
      <div className='w-8/10 h-8/10 rounded-lg '>
        <CopilotChat className='h-full w-full rounded-2xl py-6' labels={{ initial: 'Hello, how can I help you today?' }} />
      </div>
    </div>
  );
};

export default MastraChat;
