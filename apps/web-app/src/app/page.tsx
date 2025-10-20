'use client';
import React, { useState } from 'react';
import '@copilotkit/react-ui/styles.css';
import './globals.css';
import { CopilotKit, useRenderToolCall } from '@copilotkit/react-core';
import { CopilotChat } from '@copilotkit/react-ui';
import type z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { downloadCalendarEvent } from './actions';
import { client } from '@/lib/hono';
import { type sessionSchema, type sessionsSchema } from '@/mastra/schema';
import { CompactSessionsWidget } from '@/components/compact-sessions-widget';
import { Button } from '@/components/ui/button';

const MastraChat: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(uuidv4() as string);
  return (
    <>
      <div className='flex flex-row gap-2 items-center p-2'>
        <Button onClick={() => setSessionId(uuidv4() as string)}>New Session Id</Button>
        {sessionId && <p>Session Id: {sessionId}</p>}
      </div>
      <CopilotKit
        runtimeUrl={client.api.copilotkit['mastra-agent'].$url().pathname}
        showDevConsole={false}
        agent='mastraAgent'
        properties={{ sessionId }}
      >
        <Chat />
      </CopilotKit>
    </>
  );
};

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

  useRenderToolCall(
    {
      name: 'searchSessionsTool',
      render: ({ args, result }) => (
        <CompactSessionsWidget query={args.query} results={result as z.infer<typeof sessionsSchema>} onSave={saveSession} />
      ),
    },
    []
  );

  return (
    <div className='flex justify-center items-center h-full w-full' style={{ background }}>
      <div className='w-8/10 h-8/10 rounded-lg '>
        <CopilotChat
          className='h-full w-full rounded-2xl py-6'
          labels={{ initial: 'Hi, please tell what you are looking for. I will help you find the best sessions for you.' }}
        />
      </div>
    </div>
  );
};

export default MastraChat;
