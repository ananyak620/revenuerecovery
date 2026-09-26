"""
ReviveAI — In-Memory Vector Store

Provides indexed vector storage, cosine similarity search,
and metadata filtering for retrieval-augmented generation.
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
import math


@dataclass
class SearchResult:
    """Represents a retrieved chunk with similarity score and metadata."""
    chunk_id: str
    doc_id: str
    text: str
    score: float
    metadata: Dict[str, Any] = field(default_factory=dict)


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity between two dense vectors."""
    dot = sum(a * b for a, b in zip(v1, v2))
    # If vectors are already L2 normalized, dot product equals cosine similarity
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)


class VectorStore:
    """In-memory vector index with metadata filtering and top-k retrieval."""

    def __init__(self):
        self.chunks: List[Dict[str, Any]] = []
        self.embeddings: List[List[float]] = []

    def clear(self) -> None:
        """Clear all stored vectors and chunks."""
        self.chunks.clear()
        self.embeddings.clear()

    def add_chunks(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> None:
        """Index a batch of text chunks and their corresponding embedding vectors."""
        if len(chunks) != len(embeddings):
            raise ValueError(f"Chunk count ({len(chunks)}) does not match embedding count ({len(embeddings)})")
        self.chunks.extend(chunks)
        self.embeddings.extend(embeddings)

    def count(self) -> int:
        """Return total number of indexed chunks."""
        return len(self.chunks)

    def search(
        self,
        query_vector: List[float],
        top_k: int = 3,
        filter_fn: Optional[Callable[[Dict[str, Any]], bool]] = None,
    ) -> List[SearchResult]:
        """
        Search for top-k most semantically similar chunks.

        Args:
            query_vector: Normalized embedding of search query
            top_k: Number of results to return
            filter_fn: Optional predicate function applied on chunk metadata

        Returns:
            List of SearchResult objects sorted in descending order of similarity
        """
        if not self.chunks:
            return []

        scored: List[SearchResult] = []
        for chunk, emb in zip(self.chunks, self.embeddings):
            if filter_fn and not filter_fn(chunk.get("metadata", {})):
                continue

            score = cosine_similarity(query_vector, emb)
            scored.append(SearchResult(
                chunk_id=chunk["chunk_id"],
                doc_id=chunk["doc_id"],
                text=chunk["text"],
                score=round(score, 4),
                metadata=chunk.get("metadata", {}),
            ))

        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[:top_k]
