import 'dotenv/config';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PgVector } from '@mastra/pg';
import { sessions } from '@/data/sessions';

const INDEX_NAME = 'session_embeddings';

async function embedSessions() {
  // eslint-disable-next-line no-console
  console.log('🚀 Starting session embedding process...');
  // eslint-disable-next-line no-console
  console.log(`📊 Total sessions to embed: ${sessions.length}`);

  // Initialize PostgreSQL vector store
  const vectorStore = new PgVector({
    connectionString: process.env.DB_CONNECTION_STRING!,
  });

  // Delete existing index and recreate to clear all data
  // eslint-disable-next-line no-console
  console.log('🗑️  Clearing existing session embeddings...');
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

  // Create searchable text for each session
  const sessionTexts = sessions.map((session, index) => {
    const speakersText = session.speakers.join(' ');
    // Combine title, description, and speakers for semantic search
    const searchableText = `${session.title} ${session.description} ${speakersText}`;
    // eslint-disable-next-line no-console
    console.log(`  📄 Session ${index + 1}: ${session.title}`);
    return searchableText;
  });

  // Generate embeddings for all sessions
  // eslint-disable-next-line no-console
  console.log('\n🔮 Generating embeddings...');
  const { embeddings } = await embedMany({
    values: sessionTexts,
    model: openai.embedding('text-embedding-3-small'),
  });

  // eslint-disable-next-line no-console
  console.log(`  ✅ Generated ${embeddings.length} embeddings`);

  // Store embeddings in vector database with session index in metadata
  // eslint-disable-next-line no-console
  console.log('💾 Storing embeddings in vector database...');
  await vectorStore.upsert({
    indexName: INDEX_NAME,
    vectors: embeddings,
    metadata: sessions.map((session, index) => ({
      sessionIndex: index,
      title: session.title,
      room: session.room,
    })),
  });

  // eslint-disable-next-line no-console
  console.log('✨ Session embedding complete!');
  // eslint-disable-next-line no-console
  console.log(`\n📊 Summary:`);
  // eslint-disable-next-line no-console
  console.log(`  - Sessions processed: ${sessions.length}`);
  // eslint-disable-next-line no-console
  console.log(`  - Embeddings stored: ${embeddings.length}`);
  // eslint-disable-next-line no-console
  console.log(`  - Index name: ${INDEX_NAME}`);
}

// Run the script
embedSessions().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
