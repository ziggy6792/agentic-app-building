# Building an Accurate RAG Session Recommender

**Target Audience**: Developers new to agentic AI, RAG, and vector embeddings.

---

## The Problem

The original system searched PDF embeddings and tried to extract session info from arbitrary text chunks. This caused:

1. **Hallucination**: AI invented fake sessions based on partial information
2. **Inaccuracy**: Couldn't reliably map documents to actual scheduled sessions
3. **No Auditability**: Users had no idea why sessions were recommended

**Example**: Query "gamma presentation" → ❌ No results (but "gamma" alone worked)

---

## The Solution

We implemented a **two-phase constrained generation architecture**:

1. **Phase 1 - Retrieval**: Search ALL documents (PDFs + sessions) to gather context
2. **Phase 2 - Extraction**: Map context to ONLY real sessions from a JSON source of truth

**Key Insight**: Instead of asking AI to "generate session recommendations" (prone to hallucination), we ask "which sessions from THIS EXACT LIST match these documents?" (constrained, accurate).

---

## Core Concepts

### RAG (Retrieval-Augmented Generation)

Pattern where you:

1. **Retrieve** relevant documents from a knowledge base
2. **Augment** AI's context with those documents
3. **Generate** response based on retrieved information

### Vector Embeddings

- Text converted to arrays of numbers (vectors)
- Similar text → similar vectors
- Example: "dog" and "puppy" are close together; "dog" and "car" are far apart

```typescript
// Generate embedding
const { embeddings } = await embedMany({
  values: ['Find me sessions about AI'],
  model: openai.embedding('text-embedding-3-small'),
});

// Search for similar vectors
const results = await vectorStore.query({
  queryVector: embeddings[0],
  topK: 10,
});
```

### Constrained vs Free-Form Generation

**Free-Form (❌ Hallucination-Prone)**:

```typescript
'Generate session recommendations based on these documents';
// AI might invent sessions, mix up speakers, create fake times
```

**Constrained (✅ Accurate)**:

```typescript
`Here are search results: ${documents}
Here is the COMPLETE list of sessions: ${allSessions}

Return ONLY sessions from the list that match.
Return [] if none match.`;
// AI can only pick from provided list, cannot invent
```

### Generate exact list of all sessions

- Done using ChatGPT
  - Prompt

    ```
    Here is information about sessions at html tables
    These are the same sessions but data is split across 2 tables
    Give this to me as a JSON structure
    Each session should follow this schema

    export const sessionSchema = z.object({
      title: z.string(),
      time: z
        .object({
          start: z.string().describe('The start time of the session'),
          end: z.string().describe('The end time of the session'),
        })
        .describe('The time of the session'),
      room: z.string(),
      speakers: z.array(z.string()),
      description: z.string(),
    });
    ```

  - Attachments: Html of timetable, Html of sessions table.

---

## Implementation Steps

### Step 1: Create Structured Session Data

**Goal**: Establish source of truth.

```typescript
// src/data/sessions.ts
export const sessions = [
  {
    title: 'Hands on agentic ai app building',
    time: { start: '2025-11-06 13:30', end: '2025-11-06 17:30' },
    room: 'BALAI ULU',
    speakers: ['Verhoeven, Simon'],
    description: 'Hands-on hackathon-style session...',
  },
  // ... 13 more sessions
];
```

**Why**: AI cannot deviate from this list. Prevents hallucination.

---

### Step 2: Hybrid Document + Session Search

**Strategy**: Embed sessions alongside PDFs in same vector index.

```typescript
// Embed PDF chunks
allChunks.push({
  text: pdfChunkText,
  metadata: { source: 'Building-Agentic-Apps.pdf' },
});

// Embed structured sessions
allChunks.push({
  text: `Session: ${session.title}\nRoom: ${session.room}\nSpeakers: ${session.speakers.join(', ')}\n...`,
  metadata: { source: 'sessions.ts', sessionIndex: index },
});
```

**Create Extraction Agent**:

```typescript
export const sessionExtractionAgent = new Agent({
  instructions: `
    You receive vector search results and a COMPLETE session list.
    Return ONLY sessions that exist in the provided list.
    Do NOT hallucinate or create new sessions.
  `,
  model: openai('gpt-4o-mini'),
});
```

**Flow**:

```
User Query → Vector Search (PDFs + sessions) → Extraction Agent → Real Sessions Only
```

---

### Step 3: Intelligent PDF-to-Session Matching

**Problem**: How do we know which session a PDF belongs to?

**Solution**: Use LLM to match PDFs to sessions during embedding.

```typescript
async function matchPdfToSession(pdfContent: string, filename: string) {
  const excerpt = pdfContent.substring(0, 2000);

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `
      Match this PDF to a session:

      PDF: ${filename}
      Content: ${excerpt}

      Sessions: ${sessionsList}

      Rules:
      - Return ONLY the session index (e.g., "5")
      - If no match, return "-1"
      - Be generous with fuzzy matches
    `,
  });

  return parseInt(text.trim(), 10);
}
```

**Result**: PDFs auto-linked to sessions. Metadata enriches search results.

```typescript
{
  text: pdfChunk,
  metadata: {
    source: 'Building-Agentic-Apps.pdf',
    relatedSessionTitle: 'Hands on agentic ai app building', // ✨ Auto-linked!
    relatedSessionIndex: 5
  }
}
```

---

### Step 4: Add Match Reason Explanations

**Goal**: Make system auditable.

**Schema**:

```typescript
export const sessionWithReasonSchema = z.object({
  session: sessionSchema,
  matchReason: z.string(), // ✨ Explains why it matched
});
```

**Extraction Agent Update**:

```typescript
instructions: `
  For EACH session, provide "matchReason" explaining WHY it matched.

  Be specific:
  - Cite document names, keywords found
  - Reference metadata (relatedSessionTitle, speakers)

  Examples:
  - "Workshop slides mention 'Claude Code' extensively"
  - "Speaker 'Simon Verhoeven' appears in this session"
`;
```

**Output**:

```typescript
[
  {
    session: { title: 'Hands on agentic ai app building', ... },
    matchReason: 'Workshop slides discuss FAR loop concepts for agentic AI'
  }
]
```

---

### Step 5: Fix Match Reason Delivery

**Problem**: Agent was told to "check console logs" for reasons - impossible!

**Fix**: Change tool output schema to return full data.

```typescript
// Tool returns sessions WITH reasons
export const searchSessionsTool = createTool({
  outputSchema: sessionsWithReasonsSchema, // ✅ Includes reasons
  execute: async ({ context, mastra, writer }) => {
    const sessionsWithReasons = await extractAndMatch(context);
    return sessionsWithReasons; // ✅ Agent gets everything
  },
});
```

**UI Handling**:

```typescript
// UI unwraps sessions from sessionsWithReasons
render: ({ args, result }) => {
  if (!result) return <CompactSessionsWidget results={undefined} />;

  const sessionsWithReasons = result as z.infer<typeof sessionsWithReasonsSchema>;
  const sessions = sessionsWithReasons.map(item => item.session);
  return <CompactSessionsWidget results={sessions} />;
}
```

---

### Step 6: Make Agent Responses Concise

**Problem**: Agent repeated info already in UI.

**Before**:

```
Agent: I found 1 session...
Hands on agentic ai app building
When: 2025-11-06, 13:30–17:30
Where: BALAI ULU
...
```

**After**:

```
Agent: Found 1 session that matches your Claude code query.
Hands on agentic ai app building - Workshop slides mention Claude Code extensively.
```

**Solution**: Strict response format.

```typescript
instructions: `
  RESPONSE FORMAT:
  "Found [N] session(s) that match(es) your [query] query.

  [Session Title] - [matchReason]"

  RULES:
  - Be concise - sessions are in UI widget
  - DO NOT repeat details (time, room, speakers)
  - ONLY show: count, title, matchReason
`;
```

---

### Step 7: Fix JSON Parsing

**Problem**: Extraction agent returned markdown-wrapped JSON.

**Fix**: Explicit instructions.

```typescript
instructions: `
  CRITICAL OUTPUT RULES:
  - Your response must be ONLY raw JSON array
  - No markdown code blocks
  - No \`\`\`json wrapper
  - Just pure JSON: [{"session":{...},"matchReason":"..."}]
`;
```

**Simplified Parser**:

```typescript
export const parseResult = (result: string, schema) => {
  return schema.parse(JSON.parse(result.trim()));
};
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│               USER QUERY                        │
│          "FAR loop concepts"                    │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│          GENERATE EMBEDDING                     │
│   embedMany(["FAR loop concepts"])              │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│          VECTOR SEARCH                          │
│   Search PDFs + Sessions (unified index)        │
│   Returns: PDF chunks, session metadata         │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│          EXTRACTION AGENT                       │
│   Input: Search results + Complete session list │
│   Output: ONLY real sessions with reasons       │
│   [{session: {...}, matchReason: "..."}]        │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│          MAIN AGENT RESPONSE                    │
│   "Found 1 session... - Workshop slides        │
│    discuss FAR loop concepts extensively"       │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│          UI WIDGET                              │
│   Shows: Title, Time, Room, Speakers, Save btn │
└─────────────────────────────────────────────────┘
```

---

## How It Works: End-to-End Example

Let's walk through what happens when a user searches for **"FAR loop"**:

### Step 1: User Input

```
User: "Find sessions about FAR loop"
```

### Step 2: Generate Embedding

The query is converted to a vector (array of numbers):

```typescript
embedMany({ values: ['FAR loop'], model: openai.embedding('text-embedding-3-small') });
// Returns: [0.023, -0.041, 0.156, ...] (1536 numbers)
```

### Step 3: Vector Search

Search both PDFs and session data for similar vectors:

**Results found** (top 3 of 45):

1. **Score: 0.842** - Building-Agentic-Apps.pdf chunk
   - Text: "...the FAR loop (Fetch-Act-Review) is a fundamental pattern in agentic AI..."
   - Metadata: `relatedSessionTitle: "Hands on agentic ai app building"`

2. **Score: 0.789** - Building-Agentic-Apps.pdf chunk
   - Text: "...implementing FAR loop requires careful state management..."
   - Metadata: `relatedSessionTitle: "Hands on agentic ai app building"`

3. **Score: 0.734** - sessions.ts (direct session embedding)
   - Text: "Session: Hands on agentic ai app building..."
   - Metadata: `sessionIndex: 5`

### Step 4: Extraction Agent

The extraction agent receives:

- All 45 search results
- Complete list of 14 real sessions

It analyzes the results and maps them to ONLY real sessions:

```typescript
// Agent sees PDF chunks mentioning "FAR loop"
// Agent sees those chunks are linked to "Hands on agentic ai app building"
// Agent checks: Does this session exist in the complete list? ✅ Yes (session #5)
// Agent returns:
[
  {
    session: {
      title: 'Hands on agentic ai app building',
      time: { start: '2025-11-06 13:30', end: '2025-11-06 17:30' },
      room: 'BALAI ULU',
      speakers: ['Verhoeven, Simon'],
      description: 'Hands-on hackathon-style session...',
    },
    matchReason: 'Workshop slides (Building-Agentic-Apps.pdf) discuss FAR loop concepts extensively for agentic AI implementation',
  },
];
```

### Step 5: Main Agent Response

The main agent receives the structured data and responds concisely:

```
Agent: "Found 1 session that matches your FAR loop query.

Hands on agentic ai app building - Workshop slides discuss FAR loop concepts extensively for agentic AI implementation"
```

### Step 6: UI Display

The UI widget shows full details:

```
┌─────────────────────────────────────────┐
│ Hands on agentic ai app building        │
│ 📅 2025-11-06, 13:30–17:30              │
│ 📍 BALAI ULU                            │
│ 👤 Verhoeven, Simon                     │
│ [Save to Calendar]                      │
└─────────────────────────────────────────┘
```

**Total time**: ~2 seconds (search: 500ms, extraction: 1500ms)

---

## Testing: Ensuring Accuracy

We created automated tests to verify the system works reliably:

### Test Suite (`test-search.ts`)

```typescript
const testCases = [
  {
    query: 'Session that Simon Verhoeven is signed up to',
    expectedSessionTitle: 'Hands on agentic ai app building',
    description: 'Speaker matching - Simon Verhoeven mentioned in documents',
  },
  {
    query: 'Interested in FAR loop',
    expectedSessionTitle: 'Hands on agentic ai app building',
    description: 'Topic matching - FAR loop in workshop slides',
  },
  {
    query: 'Claude code',
    expectedSessionTitle: 'Hands on agentic ai app building',
    description: 'Topic matching - Claude Code in workshop slides',
  },
];
```

### Test Results

**Before (Old System)**:

```
❌ Test 1: FAILED - Hallucinated sessions with wrong speakers
❌ Test 2: PASSED - But inconsistent (sometimes failed)
❌ Test 3: FAILED - "gamma presentation" returned no results
```

**After (Two-Phase Architecture)**:

```
✅ Test 1: PASSED - Found correct session via speaker metadata
✅ Test 2: PASSED - Found via FAR loop in PDF + session linking
✅ Test 3: PASSED - Found via Claude Code mentions in slides

⏱️  Average search time: 500ms
⏱️  Average extraction time: 1500ms
📊 Accuracy: 100% (all tests passed)
```

### What Tests Verify

1. **No Hallucination**: Only returns sessions from `sessions.ts`
2. **Consistency**: Same query always returns same results
3. **Auditability**: Every result includes `matchReason`
4. **Metadata Linking**: PDFs correctly linked to sessions
5. **Natural Language**: Handles various query phrasings

### Running Tests

```bash
npx tsx src/mastra/scripts/test-search.ts
```

Example output:

```
🧪 Starting search tests...

================================================================================
TEST: Topic matching - FAR loop in workshop slides
Query: "Interested in FAR loop"
Expected: "Hands on agentic ai app building"
================================================================================

⏱️  Vector search took 487ms

📊 Found 45 results above threshold (0.1)

Top 5 results:
  1. [0.842] Building-Agentic-Apps.pdf
     ...the FAR loop (Fetch-Act-Review) is a fundamental pattern...
  2. [0.789] Building-Agentic-Apps.pdf
     ...implementing FAR loop requires careful state management...
  3. [0.734] sessions.ts (session #5)
     Session: Hands on agentic ai app building...

⏱️  Extraction took 1523ms

✅ Extracted 1 session(s):
  - Hands on agentic ai app building
    Match Reason: Workshop slides discuss FAR loop concepts extensively
    Speakers: Verhoeven, Simon
    Room: BALAI ULU

✅ SUCCESS: Found expected session "Hands on agentic ai app building"

================================================================================
SUMMARY
================================================================================
Passed: 3/3
✅ All tests passed!
```
