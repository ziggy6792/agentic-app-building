import "dotenv/config";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { LibSQLVector } from "@mastra/libsql";
import { MDocument } from "@mastra/rag";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const DOCS_PATH = join(process.cwd(), "docs");
const INDEX_NAME = "documents";

async function embedDocuments() {
  console.log("🚀 Starting document embedding process...");

  // Initialize LibSQL vector store
  const vectorStore = new LibSQLVector({
    connectionUrl: process.env.DATABASE_URL || "file:./data/vectors.db",
  });

  // Create index for embeddings (1536 dimensions for text-embedding-3-small)
  console.log("📊 Creating vector index...");
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
      const content = readFileSync(filePath, "utf-8");

      // Create document based on file type
      let doc: any;
      if (file.endsWith(".md")) {
        doc = MDocument.fromMarkdown(content, { source: file });
      } else if (file.endsWith(".pdf")) {
        // For PDF, we'll need to extract text first (requires additional setup)
        console.log(`⚠️  PDF processing not yet implemented for ${file}`);
        continue;
      } else {
        doc = MDocument.fromText(content, { source: file });
      }

      // Chunk the document
      const chunks = await doc.chunk({
        strategy: "recursive",
        maxSize: 1000,
        overlap: 100,
      });

      console.log(`  ✂️  Created ${chunks.length} chunks`);

      // Add chunks with metadata
      chunks.forEach((chunk) => {
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
  console.log("🔮 Generating embeddings...");
  const { embeddings } = await embedMany({
    values: allChunks.map((chunk) => chunk.text),
    model: openai.embedding("text-embedding-3-small"),
  });

  console.log(`  ✅ Generated ${embeddings.length} embeddings`);

  // Store embeddings in vector database
  console.log("💾 Storing embeddings in vector database...");
  await vectorStore.upsert({
    indexName: INDEX_NAME,
    vectors: embeddings,
    metadata: allChunks.map((chunk) => chunk.metadata),
  });

  console.log("✨ Document embedding complete!");
  console.log(`\n📊 Summary:`);
  console.log(`  - Files processed: ${files.length}`);
  console.log(`  - Total chunks: ${allChunks.length}`);
  console.log(`  - Embeddings stored: ${embeddings.length}`);
  console.log(`  - Index name: ${INDEX_NAME}`);
}

// Run the script
embedDocuments().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
