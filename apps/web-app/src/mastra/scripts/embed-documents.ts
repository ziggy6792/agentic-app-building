import 'dotenv/config';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
// import { PgVector } from '@mastra/pg';
import { MDocument } from '@mastra/rag';
import { LibSQLVector } from '@mastra/libsql';

const DOCS_PATH = join(process.cwd(), 'docs');

const DATA_PATH = join(process.cwd(), 'data');

if (!existsSync(DOCS_PATH)) {
  mkdirSync(DOCS_PATH);
}

if (!existsSync(DATA_PATH)) {
  mkdirSync(DATA_PATH);
}

const INDEX_NAME = 'documents';

async function embedDocuments() {
  // eslint-disable-next-line no-console
  console.log('🚀 Starting document embedding process...');

  // Initialize PostgreSQL vector store
  const vectorStore = new LibSQLVector({
    connectionUrl: 'file:./data/vectors.db',
  });

  // Delete existing index and recreate to clear all data
  // eslint-disable-next-line no-console
  console.log('🗑️  Clearing existing embeddings...');
  try {
    await vectorStore.deleteIndex({ indexName: INDEX_NAME });
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
    indexName: INDEX_NAME,
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

      // Add chunks with metadata
      chunks.forEach((chunk: { text: string; metadata: Record<string, unknown> }) => {
        allChunks.push({
          text: chunk.text,
          metadata: {
            text: chunk.text, // Store text in metadata for retrieval
            source: file,
            ...chunk.metadata,
          },
        });
      });
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error);
    }
  }

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
    indexName: INDEX_NAME,
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
  console.log(`  - Index name: ${INDEX_NAME}`);
}

// Run the script
embedDocuments().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
