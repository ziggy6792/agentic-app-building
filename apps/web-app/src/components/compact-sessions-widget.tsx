'use client';

import { type FC, useEffect, useRef, useState } from 'react';
import type z from 'zod';
import { BookmarkIcon, Loader2Icon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type sessionSchema } from '@/mastra/schema';

type Session = z.infer<typeof sessionSchema>;

type CompactSessionsWidgetProps = {
  query?: string;
  results?: Session[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const CompactSessionsWidget: FC<CompactSessionsWidgetProps> = ({ query = '', results }) => {
  const [savingSession, setSavingSession] = useState<number | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [truncatedSessions, setTruncatedSessions] = useState<Set<number>>(new Set());

  const descriptionRefs = useRef<Map<number, HTMLParagraphElement | null>>(new Map());

  const setDescriptionRef = (index: number) => (el: HTMLParagraphElement | null) => {
    if (el) {
      descriptionRefs.current.set(index, el);
    } else {
      descriptionRefs.current.delete(index);
    }
  };

  const recomputeTruncation = () => {
    const next = new Set<number>();
    descriptionRefs.current.forEach((el, idx) => {
      if (!el) return;
      const isOverflowing = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
      if (isOverflowing) next.add(idx);
    });
    setTruncatedSessions(next);
  };

  useEffect(() => {
    // Recompute on initial mount/update
    recomputeTruncation();

    // Observe size changes to keep truncation state accurate
    const resizeObserver = new ResizeObserver(() => recomputeTruncation());
    descriptionRefs.current.forEach((el) => {
      if (el) resizeObserver.observe(el);
    });

    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  const handleSave = async (index: number) => {
    setSavingSession(index);
    try {
      await sleep(2000);
    } finally {
      setSavingSession(null);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Searching state (result is undefined)
  if (results === undefined) {
    return (
      <Card className='w-full'>
        <CardContent className='flex items-center justify-center gap-3 py-8'>
          <Loader2Icon className='h-5 w-5 animate-spin text-muted-foreground' />
          <p className='text-sm text-muted-foreground'>Searching for {query ? `"${query}"` : 'sessions'}...</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state (result is an empty array)
  if (!results?.length) {
    return (
      <Card className='w-full'>
        <CardContent className='py-8 text-center'>
          <p className='text-sm text-muted-foreground'>No sessions found{query ? ` for "${query}"` : ''}</p>
        </CardContent>
      </Card>
    );
  }

  // Sessions display
  return (
    <Card className='w-full'>
      <CardContent className='space-y-2 p-3'>
        {results.map((session, index) => {
          const isExpanded = expandedSessions.has(index);
          return (
            <div
              key={index}
              className='grid grid-cols-[1fr_auto] items-start gap-2 rounded-lg border p-2 transition-colors hover:bg-muted/50'
            >
              <div className='space-y-1.5 min-w-0'>
                <div className='flex items-start gap-2'>
                  <h3 className='font-medium text-sm leading-tight flex-1'>{session.title}</h3>
                </div>

                <div className='flex flex-wrap gap-1 text-xs'>
                  <Badge variant='secondary' className='text-xs h-5 px-1.5'>
                    {session.time}
                  </Badge>
                  <Badge variant='outline' className='text-xs h-5 px-1.5'>
                    {session.room}
                  </Badge>
                </div>
              </div>

              <Button
                size='sm'
                variant='outline'
                className='shrink-0 h-7 px-2 bg-transparent min-w-26'
                onClick={() => handleSave(index)}
                disabled={savingSession === index}
                aria-label='Save session to calendar'
              >
                {savingSession === index ? (
                  <>
                    <Loader2Icon className='h-3.5 w-3.5 animate-spin mr-1' />
                    <span className='text-xs'>Saving...</span>
                  </>
                ) : (
                  <>
                    <BookmarkIcon className='h-3.5 w-3.5 mr-1' />
                    <span className='text-xs'>Save</span>
                  </>
                )}
              </Button>

              <div className={`space-y-1 ${isExpanded ? 'col-span-2' : ''}`}>
                <p
                  ref={setDescriptionRef(index)}
                  className={`text-xs text-muted-foreground leading-relaxed ${isExpanded ? '' : 'line-clamp-1'}`}
                >
                  {session.description}
                </p>
                {(isExpanded || truncatedSessions.has(index)) && (
                  <button onClick={() => toggleExpand(index)} className='text-xs text-primary hover:underline flex items-center gap-0.5'>
                    {isExpanded ? (
                      <>
                        Show less <ChevronUpIcon className='h-3 w-3' />
                      </>
                    ) : (
                      <>
                        Show more <ChevronDownIcon className='h-3 w-3' />
                      </>
                    )}
                  </button>
                )}
              </div>

              {session.speakers.length > 0 && (
                <div className='flex flex-wrap gap-1 col-span-2'>
                  {session.speakers.map((speaker, speakerIndex) => (
                    <span key={speakerIndex} className='text-xs text-muted-foreground'>
                      {speaker}
                      {speakerIndex < session.speakers.length - 1 && ','}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
