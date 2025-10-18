# RAG Setup for Mastra Agent

Your Mastra agent is now configured with RAG (Retrieval Augmented Generation) capabilities to answer questions about documents in the `/docs` folder.

## What's Been Set Up

### 1. Vector Store (LibSQL)
- Local vector database using LibSQL
- Stores document embeddings for semantic search
- Database location: `./data/vectors.db`

### 2. Document Processing Script
- Location: `src/mastra/scripts/embed-documents.ts`
- Processes all documents in `/docs` folder
- Creates chunks and generates embeddings using OpenAI
- Stores embeddings in the vector database

### 3. Vector Query Tool
- Location: `src/mastra/tools/vector-query.ts`
- Allows the agent to search through documents
- Returns relevant context based on semantic similarity

### 4. Updated Agent
- Agent name changed to "Camp Assistant Agent"
- Configured with vector query tool
- Can answer questions about camp documentation

## Usage

### Initial Setup (Already Done)

The documents have been embedded! Here's what was processed:
- **camp-schedule.md**: 21 chunks created and embedded
- **Sample info.pdf**: Skipped (PDF processing not yet implemented)

### Adding New Documents

When you add new documents to the `/docs` folder, run:

```bash
pnpm embed-docs
```

This will:
1. Process all markdown and text files in `/docs`
2. Create document chunks
3. Generate embeddings
4. Store them in the vector database

### Using the Agent

The agent can now answer questions like:
- "What sessions are happening on November 6?"
- "Who is speaking about Kanban?"
- "What time is the hackathon?"
- "Tell me about the Robocode tournament"

The agent will automatically use the vector query tool to search through your documents and provide relevant answers with source citations.

## File Structure

```
.
├── docs/                           # Your document files
│   └── camp-schedule.md
├── data/
│   └── vectors.db                  # Vector database
├── src/mastra/
│   ├── agents/
│   │   └── index.ts                # Agent configuration
│   ├── tools/
│   │   └── vector-query.ts         # Vector search tool
│   └── scripts/
│       └── embed-documents.ts      # Document embedding script
└── .env                            # Environment variables
```

## Environment Variables

Required in `.env`:
```
OPENAI_API_KEY=your_key_here
DATABASE_URL=file:./data/vectors.db
```

## How It Works

1. **Document Processing**:
   - Markdown files are chunked into smaller pieces
   - Each chunk is converted into a vector embedding using OpenAI's embedding model

2. **Querying**:
   - When you ask a question, it's converted to an embedding
   - The vector database finds the most similar document chunks
   - The agent uses these chunks as context to answer your question

3. **Benefits**:
   - Accurate answers based on your actual documents
   - Semantic search (understands meaning, not just keywords)
   - Scalable to large document collections

## Next Steps

### Add PDF Support
To process PDF files, you would need to:
1. Install a PDF parsing library
2. Update `embed-documents.ts` to extract text from PDFs

### Add More Document Types
The system supports:
- Markdown (.md)
- Plain text (.txt)
- HTML (.html)
- PDF (requires additional setup)
- JSON (.json)

### Customize Chunking
Edit `embed-documents.ts` to adjust:
- `maxSize`: Maximum chunk size (default: 1000 characters)
- `overlap`: Overlap between chunks (default: 100 characters)
- `strategy`: Chunking strategy ('recursive', 'markdown', 'semantic', etc.)

## Troubleshooting

**No results found?**
- Make sure you've run `pnpm embed-docs` after adding new documents
- Check that your documents are in the `/docs` folder

**Embedding script fails?**
- Verify your OPENAI_API_KEY in `.env`
- Check that the `data` directory exists
- Ensure you have sufficient OpenAI API credits

**Agent doesn't use the tool?**
- Make sure your question is about the documents
- Try being more specific in your query
