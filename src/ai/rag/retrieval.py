"""
ReviveAI — RAG Retrieval & Grounded Context Assembly

Orchestrates document ingestion, chunking, embedding, vector search,
and grounded context construction with explicit citations.
"""

from typing import Any, Dict, List, Optional

from src.ai.rag.chunking import DocumentChunker
from src.ai.rag.embeddings import EmbeddingModel
from src.ai.rag.ingestion import DocumentIngestion, Document
from src.ai.rag.vector_store import VectorStore, SearchResult


class RAGPipeline:
    """
    End-to-end RAG Pipeline for revenue recovery intelligence and policy retrieval.

    Configurable parameters:
    - chunk_size (default: 300 chars): Tuned to fit individual policy clauses and recovery tactics.
    - chunk_overlap (default: 50 chars): Preserves boundary clauses and rule identifiers across chunks.
    - top_k (default: 3): Sufficient context depth without saturating prompt token limits.
    """

    def __init__(
        self,
        chunk_size: int = 300,
        chunk_overlap: int = 50,
        top_k: int = 3,
        vector_dim: int = 256,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.top_k = top_k

        self.ingestion = DocumentIngestion()
        self.chunker = DocumentChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.embedder = EmbeddingModel(vector_dim=vector_dim)
        self.vector_store = VectorStore()
        self.is_indexed = False

    def initialize_index(self, documents: Optional[List[Document]] = None) -> int:
        """
        Ingest, chunk, embed, and index all documents into the vector store.
        Returns the total number of indexed chunks.
        """
        docs = documents if documents is not None else self.ingestion.load_all()
        all_chunks: List[Dict[str, Any]] = []

        for doc in docs:
            chunks = self.chunker.chunk_document(
                doc_id=doc.doc_id,
                text=doc.content,
                metadata={
                    "title": doc.title,
                    "category": doc.category,
                    **doc.metadata,
                },
            )
            all_chunks.extend(chunks)

        if not all_chunks:
            return 0

        # Fit embedding vocabulary on corpus
        corpus_texts = [c["text"] for c in all_chunks]
        self.embedder.fit(corpus_texts)

        # Generate dense embeddings
        embeddings = self.embedder.embed_batch(corpus_texts)

        # Populate vector store
        self.vector_store.clear()
        self.vector_store.add_chunks(all_chunks, embeddings)
        self.is_indexed = True

        return len(all_chunks)

    def retrieve(self, query: str, top_k: Optional[int] = None) -> List[SearchResult]:
        """Retrieve top-k most relevant chunks for a given query."""
        if not self.is_indexed:
            self.initialize_index()

        k = top_k if top_k is not None else self.top_k
        query_vec = self.embedder.embed_text(query)
        return self.vector_store.search(query_vec, top_k=k)

    def build_grounded_context(self, query: str, top_k: Optional[int] = None) -> Dict[str, Any]:
        """
        Assemble retrieved chunks into a prompt-ready context with explicit citations.

        Returns:
            Dict containing:
            - context_text: Formatted markdown string with bracketed citations
            - citations: List of unique document/policy IDs referenced
            - top_score: Confidence score of top retrieved chunk
            - results: Raw SearchResult items
        """
        results = self.retrieve(query, top_k=top_k)
        if not results:
            return {
                "context_text": "No specific recovery policy retrieved. Follow default regulatory cooldown.",
                "citations": ["POL-DEFAULT"],
                "top_score": 0.0,
                "results": [],
            }

        context_lines: List[str] = []
        citations: List[str] = []

        for idx, res in enumerate(results, start=1):
            doc_ref = res.doc_id
            if doc_ref not in citations:
                citations.append(doc_ref)
            snippet = res.text.replace("\n", " ").strip()
            context_lines.append(f"[{doc_ref}] (Relevance: {res.score:.2f}) {snippet}")

        return {
            "context_text": "\n\n".join(context_lines),
            "citations": citations,
            "top_score": results[0].score if results else 0.0,
            "results": results,
        }


# Singleton pipeline
_pipeline: Optional[RAGPipeline] = None


def get_rag_pipeline() -> RAGPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = RAGPipeline()
        _pipeline.initialize_index()
    return _pipeline
