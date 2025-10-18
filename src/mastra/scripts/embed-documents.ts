import 'dotenv/config';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { LibSQLVector } from '@mastra/libsql';
import { MDocument } from '@mastra/rag';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DOCS_PATH = join(process.cwd(), 'docs');

if (!existsSync(DOCS_PATH)) {
  mkdirSync(DOCS_PATH);
}

const INDEX_NAME = 'documents';

async function embedDocuments() {
  console.log('🚀 Starting document embedding process...');

  // Initialize LibSQL vector store
  const vectorStore = new LibSQLVector({
    connectionUrl: process.env.DATABASE_URL || 'file:./data/vectors.db',
  });

  // Delete existing index and recreate to clear all data
  console.log('🗑️  Clearing existing embeddings...');
  try {
    await vectorStore.deleteIndex({ indexName: INDEX_NAME });
    console.log('  ✅ Cleared existing data');
  } catch (error) {
    // Index might not exist yet, which is fine
    console.log('  ℹ️  No existing data to clear');
  }

  // Create index for embeddings (1536 dimensions for text-embedding-3-small)
  console.log('📊 Creating vector index...');
  await vectorStore.createIndex({
    indexName: INDEX_NAME,
    dimension: 1536,
  });

  // Read all files from docs folder
  const files = readdirSync(DOCS_PATH);
  console.log(`📁 Found ${files.length} files in /docs folder`);

  const allChunks: Array<{ text: string; metadata: Record<string, any> }> = [];

  // Process each document
  for (const file of files) {
    const filePath = join(DOCS_PATH, file);
    console.log(`\n📄 Processing ${file}...`);

    try {
      let doc: any;

      // Create document based on file type
      if (file.endsWith('.pdf')) {
        // Read PDF file as buffer
        const dataBuffer = readFileSync(filePath);
        // Use require for CommonJS module
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(dataBuffer);
        const content = pdfData.text;

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

      console.log(`  ✂️  Created ${chunks.length} chunks`);

      // Add chunks with metadata
      chunks.forEach((chunk: any) => {
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

  console.log(`\n📦 Total chunks to embed: ${allChunks.length}`);

  // Generate embeddings for all chunks
  console.log('🔮 Generating embeddings...');
  const { embeddings } = await embedMany({
    values: allChunks.map((chunk) => chunk.text),
    model: openai.embedding('text-embedding-3-small'),
  });

  console.log(`  ✅ Generated ${embeddings.length} embeddings`);

  // Store embeddings in vector database
  console.log('💾 Storing embeddings in vector database...');
  await vectorStore.upsert({
    indexName: INDEX_NAME,
    vectors: embeddings,
    metadata: allChunks.map((chunk) => chunk.metadata),
  });

  console.log('✨ Document embedding complete!');
  console.log(`\n📊 Summary:`);
  console.log(`  - Files processed: ${files.length}`);
  console.log(`  - Total chunks: ${allChunks.length}`);
  console.log(`  - Embeddings stored: ${embeddings.length}`);
  console.log(`  - Index name: ${INDEX_NAME}`);
}

// Run the script
embedDocuments().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
