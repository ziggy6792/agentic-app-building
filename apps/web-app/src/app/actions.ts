'use server';

import { createEvents, type EventAttributes } from 'ics';
import type z from 'zod';
import { type sessionSchema } from '@/mastra/schema';

export async function downloadCalendarEvent(session: z.infer<typeof sessionSchema>) {
  try {
    const { start, end } = session.time;
    const startDate = new Date(start);
    const endDate = new Date(end);

    const event: EventAttributes = {
      start: [startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes()],
      end: [endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), endDate.getHours(), endDate.getMinutes()],
      title: session.title,
      description: `${session.description}\n\nSpeakers: ${session.speakers.join(', ')}`,
      location: session.room,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'Conference', email: 'info@conference.com' },
    };

    const { error, value } = createEvents([event]);

    if (error) {
      console.error('Error creating calendar event:', error);
      return { success: false, error: error.message };
    }

    return { success: true, icsContent: value };
  } catch (err) {
    console.error('Error in downloadCalendarEvent:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
