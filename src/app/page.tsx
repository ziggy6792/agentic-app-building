'use client';
import React, { useState } from 'react';
import '@copilotkit/react-ui/styles.css';
import './globals.css';
import { CopilotKit, useCopilotAction } from '@copilotkit/react-core';
import { CopilotChat } from '@copilotkit/react-ui';
import { client } from '@/lib/hono';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MastraChat: React.FC = () => {
  return (
    <CopilotKit runtimeUrl={client.api.copilotkit['mastra-agent'].$url().pathname} showDevConsole={false} agent='mastraAgent'>
      <Chat />
    </CopilotKit>
  );
};

const ToolCallMessage = ({ title, args, status, result }: { title: string; args: unknown; status: unknown; result?: unknown }) => (
  <div className='bg-muted/30 my-2 rounded-md border p-3 text-sm'>
    <div className='mb-1 font-medium'>{title}</div>
    <pre className='bg-background max-h-40 overflow-auto rounded p-2 text-xs'>{JSON.stringify(args, null, 2)}</pre>
    <div className='text-muted-foreground mt-2 text-xs'>Status: {typeof status === 'string' ? status : JSON.stringify(status)}</div>
    {typeof result !== 'undefined' && (
      <div className='mt-2'>
        <div className='mb-1 text-xs font-medium'>Result</div>
        <pre className='bg-background max-h-40 overflow-auto rounded p-2 text-xs'>{JSON.stringify(result, null, 2)}</pre>
      </div>
    )}
  </div>
);

const Chat = () => {
  const [background, setBackground] = useState<string>('black');

  useCopilotAction({
    name: 'change_background',
    description:
      'Change the background color of the chat. Can be anything that the CSS background attribute accepts. Regular colors, linear of radial gradients etc.',
    parameters: [
      {
        name: 'background',
        type: 'string',
        description: 'The background. Prefer gradients.',
      },
    ],
    handler: async ({ background }) => {
      console.log('setBackground', background);
      // await sleep(100);
      setBackground(background);
    },
    render: ({ args, result, status }) => <ToolCallMessage title='Tool call: change_background' args={args} result={result} status={status} />,
  });

  return (
    <div className='flex justify-center items-center h-full w-full' style={{ background }}>
      <div className='w-8/10 h-8/10 rounded-lg '>
        <CopilotChat className='h-full w-full rounded-2xl py-6' labels={{ initial: 'Hello, how can I help you today?' }} />
      </div>
    </div>
  );
};

export default MastraChat;
