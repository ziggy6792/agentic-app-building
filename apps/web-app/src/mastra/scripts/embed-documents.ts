import 'dotenv/config';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { embedMany, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PgVector } from '@mastra/pg';
import { MDocument } from '@mastra/rag';
import { DOCUMENTS_INDEX_NAME } from '../config';
import { sessions } from '@/data/sessions';

const DOCS_PATH = join(process.cwd(), 'docs');

if (!existsSync(DOCS_PATH)) {
  mkdirSync(DOCS_PATH);
}

// Sanitize text to remove null bytes and other problematic characters
function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove other control characters except newline and tab
}

// Intelligently match PDF content to a session using LLM
async function matchPdfToSession(pdfContent: string, filename: string): Promise<{ index: number; title: string } | undefined> {
  // Use first 2000 characters for matching (title page + intro)
  const excerpt = pdfContent.substring(0, 2000);

  // Build session list for matching
  const sessionsList = sessions
    .map(
      (session, index) =>
        `${index}. "${session.title}" - ${session.description.substring(0, 100)}${session.description.length > 100 ? '...' : ''}`
    )
    .join('\n');

  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `You are matching a PDF document to camp sessions.

PDF Filename: ${filename}
PDF Content (first 2000 chars):
${excerpt}

Available Sessions:
${sessionsList}

Task: Determine which session this PDF belongs to based on title, content, and topic similarity.

Rules:
- Return ONLY the session index number (e.g., "5")
- If no clear match exists, return "-1"
- Match based on topic, keywords, and semantic similarity
- Be generous with fuzzy matches (e.g., "Building Agentic Apps" matches "Hands on agentic ai app building")

Response (number only):`,
      temperature: 0,
    });

    const sessionIndex = parseInt(text.trim(), 10);

    if (sessionIndex >= 0 && sessionIndex < sessions.length) {
      // eslint-disable-next-line no-console
      console.log(`    🔗 Matched to session: "${sessions[sessionIndex].title}"`);
      return {
        index: sessionIndex,
        title: sessions[sessionIndex].title,
      };
    }

    // eslint-disable-next-line no-console
    console.log('    ℹ️  No clear session match found');
    return undefined;
  } catch (error) {
    console.error(`    ❌ Error matching PDF to session:`, error);
    return undefined;
  }
}

async function embedDocuments() {
  // eslint-disable-next-line no-console
  console.log('🚀 Starting document embedding process...');

  // Initialize PostgreSQL vector store
  const vectorStore = new PgVector({
    connectionString: process.env.DB_CONNECTION_STRING!,
  });

  // Delete existing index and recreate to clear all data
  // eslint-disable-next-line no-console
  console.log('🗑️  Clearing existing embeddings...');
  try {
    await vectorStore.deleteIndex({ indexName: DOCUMENTS_INDEX_NAME });
    // eslint-disable-next-line no-console
    console.log('  ✅ Cleared existing data');
  } catch {
    // Index might not exist yet, which is fine
    // eslint-disable-next-line no-console
    console.log('  ℹ️  No existing data to clear');
  }

  // Create index for embeddings (1536 dimensions for text-embedding-3-small)
  // eslint-disable-next-line no-console
  console.log('📊 Creating vector index...');
  await vectorStore.createIndex({
    indexName: DOCUMENTS_INDEX_NAME,
    dimension: 1536,
  });

  // Read all files from docs folder
  const files = readdirSync(DOCS_PATH);
  // eslint-disable-next-line no-console
  console.log(`📁 Found ${files.length} files in /docs folder`);

  const allChunks: Array<{ text: string; metadata: Record<string, unknown> }> = [];

  // Process each document
  for (const file of files) {
    const filePath = join(DOCS_PATH, file);
    // eslint-disable-next-line no-console
    console.log(`\n📄 Processing ${file}...`);

    try {
      let doc: MDocument;
      let pdfContent: string | undefined;

      // Create document based on file type
      if (file.endsWith('.pdf')) {
        // Read PDF file as buffer
        const dataBuffer = readFileSync(filePath);
        // Use require for CommonJS module
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const pdfData = await pdfParse(dataBuffer);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const content = pdfData.text as string;
        pdfContent = content;

        // eslint-disable-next-line no-console
        console.log(`  📄 Extracted ${content.length} characters from PDF`);
        doc = MDocument.fromText(content, { source: file });
      } else {
        // Read text-based files
        const content = readFileSync(filePath, 'utf-8');

        if (file.endsWith('.md')) {
          doc = MDocument.fromMarkdown(content, { source: file });
        } else {
          doc = MDocument.fromText(content, { source: file });
        }
      }

      // Chunk the document
      const chunks = await doc.chunk({
        strategy: 'recursive',
        maxSize: 1000,
        overlap: 100,
      });

      // eslint-disable-next-line no-console
      console.log(`  ✂️  Created ${chunks.length} chunks`);

      // Intelligently match PDF to session using LLM
      let relatedSessionTitle: string | undefined;
      let relatedSessionIndex: number | undefined;

      if (pdfContent) {
        // eslint-disable-next-line no-console
        console.log('  🤖 Using AI to match PDF to session...');
        const match = await matchPdfToSession(pdfContent, file);
        if (match) {
          relatedSessionTitle = match.title;
          relatedSessionIndex = match.index;
        }
      }

      // Add chunks with metadata
      chunks.forEach((chunk: { text: string; metadata: Record<string, unknown> }) => {
        const sanitizedText = sanitizeText(chunk.text);

        // Skip empty or very short chunks (less than 10 characters)
        // Also skip chunks that are just whitespace
        if (!sanitizedText || sanitizedText.trim().length < 10) {
          return;
        }

        allChunks.push({
          text: sanitizedText,
          metadata: {
            text: sanitizedText, // Store text in metadata for retrieval
            source: file,
            relatedSessionTitle,
            relatedSessionIndex,
            ...chunk.metadata,
          },
        });
      });
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error);
    }
  }

  // Add sessions as rich document chunks
  // eslint-disable-next-line no-console
  console.log(`\n📋 Adding ${sessions.length} sessions as rich documents...`);
  sessions.forEach((session, index) => {
    const sessionText = `
Session: ${session.title}
Time: ${session.time.start} to ${session.time.end}
Room: ${session.room}
Speakers: ${session.speakers.join(', ')}
Description: ${session.description}
    `.trim();

    const sanitizedText = sanitizeText(sessionText);
    if (sanitizedText && sanitizedText.trim().length > 10) {
      allChunks.push({
        text: sanitizedText,
        metadata: {
          text: sanitizedText,
          source: 'sessions.ts',
          sessionIndex: index,
          sessionTitle: session.title,
          sessionRoom: session.room,
          type: 'session',
        },
      });
      // eslint-disable-next-line no-console
      console.log(`  ✅ Added session: ${session.title}`);
    }
  });

  // eslint-disable-next-line no-console
  console.log(`\n📦 Total chunks to embed: ${allChunks.length}`);

  // Generate embeddings for all chunks
  // eslint-disable-next-line no-console
  console.log('🔮 Generating embeddings...');
  const { embeddings } = await embedMany({
    values: allChunks.map((chunk) => chunk.text),
    model: openai.embedding('text-embedding-3-small'),
  });

  // eslint-disable-next-line no-console
  console.log(`  ✅ Generated ${embeddings.length} embeddings`);

  // Store embeddings in vector database
  // eslint-disable-next-line no-console
  console.log('💾 Storing embeddings in vector database...');
  await vectorStore.upsert({
    indexName: DOCUMENTS_INDEX_NAME,
    vectors: embeddings,
    metadata: allChunks.map((chunk) => chunk.metadata),
  });

  // eslint-disable-next-line no-console
  console.log('✨ Document embedding complete!');
  // eslint-disable-next-line no-console
  console.log(`\n📊 Summary:`);
  // eslint-disable-next-line no-console
  console.log(`  - Files processed: ${files.length}`);
  // eslint-disable-next-line no-console
  console.log(`  - Total chunks: ${allChunks.length}`);
  // eslint-disable-next-line no-console
  console.log(`  - Embeddings stored: ${embeddings.length}`);
  // eslint-disable-next-line no-console
  console.log(`  - Index name: ${DOCUMENTS_INDEX_NAME}`);
}

// Run the script
embedDocuments().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
