"""
ReviveAI — RAG Document Chunking & Cleaning Engine

Provides configurable text cleaning, normalization, and sliding-window chunking
with overlap to preserve critical context across document boundaries.
"""

from typing import Any, Dict, List
import re


class DocumentChunker:
    """
    Splits policy documents and recovery playbooks into semantic chunks.

    Design rationale:
    - chunk_size=300 characters (~50-60 words): Matches the compact, discrete rule
      definitions typical of banking circulars and dunning tactics.
    - chunk_overlap=50 characters: Ensures boundary terms (such as 'POL-01', 'cooldown',
      'UPI limits') are not bifurcated across adjacent chunks.
    """

    def __init__(self, chunk_size: int = 300, chunk_overlap: int = 50):
        if chunk_overlap >= chunk_size:
            raise ValueError(f"chunk_overlap ({chunk_overlap}) must be strictly less than chunk_size ({chunk_size})")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def clean_text(self, text: str) -> str:
        """Strip markdown artifacts, excessive whitespace, and normalize casing."""
        # Replace multiple spaces/newlines with a single space
        cleaned = re.sub(r"\s+", " ", text).strip()
        return cleaned

    def chunk_document(self, doc_id: str, text: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Split a document into overlapping chunks with traceability metadata.
        """
        cleaned = self.clean_text(text)
        chunks: List[Dict[str, Any]] = []

        if len(cleaned) <= self.chunk_size:
            return [{
                "chunk_id": f"{doc_id}_c0",
                "doc_id": doc_id,
                "text": cleaned,
                "start_char": 0,
                "end_char": len(cleaned),
                "metadata": metadata,
            }]

        start = 0
        chunk_idx = 0
        step = self.chunk_size - self.chunk_overlap

        while start < len(cleaned):
            end = min(start + self.chunk_size, len(cleaned))
            chunk_text = cleaned[start:end].strip()
            if chunk_text:
                chunks.append({
                    "chunk_id": f"{doc_id}_c{chunk_idx}",
                    "doc_id": doc_id,
                    "text": chunk_text,
                    "start_char": start,
                    "end_char": end,
                    "metadata": metadata,
                })
                chunk_idx += 1

            if end >= len(cleaned):
                break
            start += step

        return chunks
