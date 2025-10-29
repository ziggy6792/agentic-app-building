import 'dotenv/config';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PgVector } from '@mastra/pg';
import { mastra } from '../index';
import { type sessionExtractionAgent } from '../agents';
import { parseResult } from '../mastra-utils';
import { sessionsWithReasonsSchema } from '../schema';

const INDEX_NAME = 'documents_session_explorer_improved';
const SCORE_THRESHOLD = 0.1;

interface TestCase {
  query: string;
  expectedSessionTitle: string;
  description: string;
}

const testCases: TestCase[] = [
  {
    query: 'Session that Simon Verhoeven is signed up to',
    expectedSessionTitle: 'Hands on agentic ai app building',
    description: 'Speaker matching - Simon Verhoeven mentioned in documents',
  },
  {
    query: 'Interested in FAR loop',
    expectedSessionTitle: 'Hands on agentic ai app building',
    description: 'Topic matching - FAR loop mentioned in workshop slides',
  },
  {
    query: 'Claude code',
    expectedSessionTitle: 'Hands on agentic ai app building',
    description: 'Topic matching - Claude Code mentioned in workshop slides',
  },
];

async function testSearch(testCase: TestCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${testCase.description}`);
  console.log(`Query: "${testCase.query}"`);
  console.log(`Expected: "${testCase.expectedSessionTitle}"`);
  console.log('='.repeat(80));

  try {
    // Generate embedding for the query
    const startTime = Date.now();
    const { embeddings } = await embedMany({
      values: [testCase.query],
      model: openai.embedding('text-embedding-3-small'),
    });
    const queryEmbedding = embeddings[0];

    // Initialize vector store
    const vectorStore = new PgVector({
      connectionString: process.env.DB_CONNECTION_STRING!,
    });

    // Query the vector database
    const results = await vectorStore.query({
      indexName: INDEX_NAME,
      queryVector: queryEmbedding,
      topK: 15 * 3, // Same as tool: 15 * 3
    });

    const searchTime = Date.now() - startTime;
    console.log(`\n⏱️  Vector search took ${searchTime}ms`);

    // Filter and format results
    const formattedResults = results
      .filter((result) => result.score > SCORE_THRESHOLD)
      .map((result, index) => ({
        rank: index + 1,
        text: result.metadata?.text ?? 'No text available',
        source: result.metadata?.source ?? 'Unknown source',
        score: result.score,
        sessionIndex: result.metadata?.sessionIndex as number | undefined,
      }));

    console.log(`\n📊 Found ${formattedResults.length} results above threshold (${SCORE_THRESHOLD})`);
    console.log('\nTop 5 results:');
    formattedResults.slice(0, 5).forEach((result) => {
      console.log(
        `  ${result.rank}. [${result.score.toFixed(3)}] ${result.source}${result.sessionIndex !== undefined ? ` (session #${result.sessionIndex})` : ''}`
      );
      console.log(`     ${result.text.substring(0, 100)}...`);
    });

    // Use extraction agent
    const extractStartTime = Date.now();
    const searchResults = {
      query: testCase.query,
      results: formattedResults,
      summary: `Found ${formattedResults.length} relevant document chunks`,
    };

    const extractAgent = mastra.getAgent('sessionExtractionAgent');
    const stream = await extractAgent.stream(JSON.stringify(searchResults));
    const extractedSessions = await stream.text;
    const extractTime = Date.now() - extractStartTime;

    console.log(`\n⏱️  Extraction took ${extractTime}ms`);

    const sessionsWithReasons = parseResult(extractedSessions, sessionsWithReasonsSchema);

    console.log(`\n✅ Extracted ${sessionsWithReasons.length} session(s):`);
    sessionsWithReasons.forEach((item) => {
      console.log(`  - ${item.session.title}`);
      console.log(`    Match Reason: ${item.matchReason}`);
      console.log(`    Speakers: ${item.session.speakers.join(', ')}`);
      console.log(`    Room: ${item.session.room}`);
    });

    // Check if expected session is in results
    const foundExpected = sessionsWithReasons.some((item) => item.session.title === testCase.expectedSessionTitle);
    if (foundExpected) {
      console.log(`\n✅ SUCCESS: Found expected session "${testCase.expectedSessionTitle}"`);
      return true;
    } else {
      console.log(`\n❌ FAILED: Expected session "${testCase.expectedSessionTitle}" not found`);
      return false;
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting search tests...\n');

  const results = await Promise.all(testCases.map((testCase) => testSearch(testCase)));

  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('✅ All tests passed!');
  } else {
    console.log(`❌ ${total - passed} test(s) failed`);
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
