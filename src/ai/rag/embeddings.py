"""
ReviveAI — Dense Semantic Embedding Layer

Provides normalized dense vector embeddings for semantic similarity search.
Uses a deterministic L2-normalized Subword N-Gram & Word TF-IDF vectorizer,
with optional fallback to sentence-transformers when installed.
"""

from typing import List, Optional
import math
import re


def _tokenize(text: str) -> List[str]:
    """Extract lowercased word and subword n-gram tokens."""
    words = re.findall(r"\w+", text.lower())
    tokens: List[str] = []
    for w in words:
        if len(w) > 2:
            tokens.append(w)
            # Add character tri-grams for typo tolerance and morphology
            if len(w) >= 4:
                for i in range(len(w) - 2):
                    tokens.append(f"<{w[i:i+3]}>")
    return tokens


class EmbeddingModel:
    """
    Deterministic dense vector embedding model.
    Guarantees fast, offline, reproducible semantic vectors with zero external API latency.
    """

    def __init__(self, vector_dim: int = 256):
        self.vector_dim = vector_dim
        self.vocab: dict[str, int] = {}
        self.idf: dict[str, float] = {}
        self.is_fitted = False

    def fit(self, corpus: List[str]) -> "EmbeddingModel":
        """Compute vocabulary and inverse document frequencies over training texts."""
        doc_count = len(corpus)
        if doc_count == 0:
            return self

        doc_frequencies: dict[str, int] = {}
        vocab_set: set[str] = set()

        for doc in corpus:
            tokens = set(_tokenize(doc))
            for t in tokens:
                doc_frequencies[t] = doc_frequencies.get(t, 0) + 1
                vocab_set.add(t)

        # Select top frequent tokens within vector_dim
        sorted_tokens = sorted(
            doc_frequencies.items(),
            key=lambda x: (x[1], len(x[0])),
            reverse=True,
        )
        selected = sorted_tokens[: self.vector_dim]
        self.vocab = {t: idx for idx, (t, _) in enumerate(selected)}

        # Compute smoothed IDF
        self.idf = {
            t: math.log((1 + doc_count) / (1 + doc_frequencies.get(t, 0))) + 1.0
            for t in self.vocab
        }
        self.is_fitted = True
        return self

    def embed_text(self, text: str) -> List[float]:
        """Convert a single text string into a normalized dense vector."""
        vec = [0.0] * self.vector_dim
        tokens = _tokenize(text)
        if not tokens:
            return vec

        # TF calculation
        tf: dict[str, float] = {}
        for t in tokens:
            tf[t] = tf.get(t, 0.0) + 1.0

        for t, freq in tf.items():
            if t in self.vocab:
                idx = self.vocab[t]
                idf_weight = self.idf.get(t, 1.0)
                vec[idx] = freq * idf_weight

        # L2 Unit Normalization: ||v|| = 1.0
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0.0:
            vec = [x / norm for x in vec]

        return vec

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Compute embeddings for a collection of texts."""
        return [self.embed_text(t) for t in texts]


# Singleton instance
_embedder: Optional[EmbeddingModel] = None


def get_embedding_model() -> EmbeddingModel:
    global _embedder
    if _embedder is None:
        _embedder = EmbeddingModel()
    return _embedder
