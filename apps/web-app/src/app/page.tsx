'use client';
import React, { useState } from 'react';
import '@copilotkit/react-ui/styles.css';
import './globals.css';
import { CopilotKit, useCopilotAction } from '@copilotkit/react-core';
import { CopilotChat } from '@copilotkit/react-ui';
import type z from 'zod';
import { downloadCalendarEvent } from './actions';
import { client } from '@/lib/hono';
import { type sessionSchema, type sessionsSchema } from '@/mastra/schema';
import { CompactSessionsWidget } from '@/components/compact-sessions-widget';

const MastraChat: React.FC = () => (
  <CopilotKit runtimeUrl={client.api.copilotkit['mastra-agent'].$url().pathname} showDevConsole={false} agent='mastraAgent'>
    <Chat />
  </CopilotKit>
);

const Chat = () => {
  const [background] = useState<string>('black');

  const saveSession = async (session: z.infer<typeof sessionSchema>) => {
    const result = await downloadCalendarEvent(session);

    if (result.success && result.icsContent) {
      // Create a blob from the ICS content
      const blob = new Blob([result.icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      console.error('Failed to generate calendar event:', result.error);
      alert('Failed to generate calendar event. Please try again.');
    }
  };

  useCopilotAction(
    {
      name: 'searchSessionsTool',
      available: 'frontend',
      render: ({ args, result }) => (
        <CompactSessionsWidget query={args.query} results={result as z.infer<typeof sessionsSchema>} onSave={saveSession} />
      ),
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
