import type z from 'zod';
import { type sessionsSchema } from '@/mastra/schema';

export const sessions: z.infer<typeof sessionsSchema> = [
  {
    title: 'Frontend Archetype Exploration',
    time: {
      start: '2025-11-06 09:30',
      end: '2025-11-06 11:30',
    },
    room: 'BALAI ULU',
    speakers: ['Chowdhury, Dhrubajit'],
    description:
      'We run a workshop to try and understand the state of frontend and craft a learning path for the SWEX members. We are going to look into roadmap.sh and look at gaps and craft our own internal journey.',
  },
  {
    title: 'Build your own SaaS',
    time: {
      start: '2025-11-06 09:30',
      end: '2025-11-06 10:30',
    },
    room: 'BALAI RAYA A',
    speakers: ['Thakur, Vaibhav'],
    description: 'Present and Demo a mini Software as a service built using GenAI and Cloud Tools.',
  },
  {
    title: 'Consulting Worksop',
    time: {
      start: '2025-11-06 09:30',
      end: '2025-11-06 10:30',
    },
    room: 'BALAI RAYA B+C',
    speakers: ['Reber, Jochen'],
    description: 'Open Discussion: What makes a good consultant and how to meet customer expectations.',
  },
  {
    title: 'Color Styles in Communication',
    time: {
      start: '2025-11-06 11:00',
      end: '2025-11-06 12:00',
    },
    room: 'BALAI RAYA A',
    speakers: ['Reber, Jochen', 'Fehse, Eric'],
    description: 'Learn how to adapt your approach to different stakeholder personalities for smoother collaboration.',
  },
  {
    title: 'Managing multi-layer Python codebase',
    time: {
      start: '2025-11-06 11:00',
      end: '2025-11-06 12:00',
    },
    room: 'BALAI RAYA B+C',
    speakers: ['Zan, Min Soe'],
    description: 'Managing multi-layer Python codebase using pyproject with a shared virtual environment.',
  },
  {
    title: 'Hands on agentic ai app building',
    time: {
      start: '2025-11-06 13:30',
      end: '2025-11-06 17:30',
    },
    room: 'BALAI ULU',
    speakers: ['Verhoeven, Simon'],
    description:
      'Hands-on hackathon-style session exploring frameworks like Mastra and CopilotKit for rapid full-stack agentic AI development. Learn core agent concepts (context, tools, memory, reasoning), use OpenAI Agent Kit, and build practical workflows.',
  },
  {
    title: 'Building Bridges, Not Walls: Creating a True DevOps Culture',
    time: {
      start: '2025-11-06 13:30',
      end: '2025-11-06 14:30',
    },
    room: 'BALAI RAYA A',
    speakers: ['Silva, Claudio', 'Romana, Sheila'],
    description:
      'How organisations can go beyond tools and automation to build a real DevOps culture—covering common struggles, benefits (speed, collaboration, stability), and agility to meet business needs.',
  },
  {
    title: 'From Earth to Interstellar Space: What Voyager 1 Can Teach Every Developer',
    time: {
      start: '2025-11-06 14:30',
      end: '2025-11-06 15:00',
    },
    room: 'BALAI RAYA A',
    speakers: ['Gutierrez, Russell'],
    description:
      'Lessons from Voyager 1’s resilient architecture and software design—redundancy, fault tolerance, minimalism, long-term thinking—and NASA’s 2022–2023 remote software fix, with takeaways for modern systems.',
  },
  {
    title: 'AI Hackathon - Spell-caster',
    time: {
      start: '2025-11-06 13:30',
      end: '2025-11-06 17:30',
    },
    room: 'BALAI RAYA B+C',
    speakers: ['Lin, Kevin', 'Tran, Vu An', 'Dang, Chi Hao'],
    description:
      'Program a bot wizard and battle on a 10×10 arena in a turn-based, wizard-themed strategy challenge. Use AI-assisted dev tools to code movement, spells, minions, and artifact tactics, then compete in a live tournament.',
  },
  {
    title: 'What? Pre-sales and Discovery again? From ‘Hmm’ to ‘Hell Yes’',
    time: {
      start: '2025-11-06 15:30',
      end: '2025-11-06 17:30',
    },
    room: 'BALAI RAYA A',
    speakers: ['Ramoso, Christina', 'Reber, Jochen', 'Hartwig, Malte'],
    description:
      'Debug a live brief, identify the real problem, and craft a one-pager that sells the path. A practical, non-standard session on pre-sales and discovery.',
  },
  {
    title: 'Kanban',
    time: {
      start: '2025-11-07 09:00',
      end: '2025-11-07 12:00',
    },
    room: 'BALAI ULU',
    speakers: ['So, Russell', 'Poon, Pei Zhen', 'Chandramohan, Shanmathi'],
    description: 'Tabletop board game simulation designed to teach the concepts and mechanics of kanban systems for software development.',
  },
  {
    title: 'Arc42 Workshop',
    time: {
      start: '2025-11-07 09:00',
      end: '2025-11-07 10:30',
    },
    room: 'BALAI RAYA A',
    speakers: ['Klems, Markus'],
    description:
      'Learn to use Arc42 to document and communicate architecture: introduction, team up, review a complex system’s docs, create Arc42 documentation, and present results.',
  },
  {
    title: 'Robo code bot challenge tournament',
    time: {
      start: '2025-11-07 09:00',
      end: '2025-11-07 12:00',
    },
    room: 'BALAI RAYA B+C',
    speakers: ['Streit, Yannick'],
    description: 'Build your own battle bot using Kotlin or Java and compete in an epic Robocode showdown.',
  },
  {
    title: 'How to conduct Interviews - SWEX (partially applicable for DX)',
    time: {
      start: '2025-11-07 11:00',
      end: '2025-11-07 12:00',
    },
    room: 'BALAI RAYA A',
    speakers: ['Stromer, Alexander'],
    description:
      'Interviewing candidates for Zühlke: how to make the most of the time and gain insight effectively; summary and invitation to provide ideas.',
  },
];
