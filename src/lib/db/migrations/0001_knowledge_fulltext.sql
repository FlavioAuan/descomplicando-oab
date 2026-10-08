-- Full-text search used by the RAG (src/lib/ai/rag.ts)
CREATE FULLTEXT INDEX `knowledge_chunks_content_ft` ON `knowledge_chunks` (`content`);
