"""
ReviveAI — RAG Pipeline Tests

Tests document ingestion, chunking, dense vector embeddings,
vector store indexing, semantic retrieval, and quantitative RAG evaluation.
"""

import pytest
from src.ai.rag.ingestion import DocumentIngestion, Document
from src.ai.rag.chunking import DocumentChunker
from src.ai.rag.embeddings import EmbeddingModel
from src.ai.rag.vector_store import VectorStore
from src.ai.rag.retrieval import RAGPipeline
from src.ai.rag.evaluate import run_rag_evaluation


def test_rag_ingestion_loads_playbooks_and_policies():
    """Verify document ingestion parses both domain playbooks and policy markdown."""
    ingestion = DocumentIngestion()
    docs = ingestion.load_all()
    assert len(docs) >= 6

    # Verify standard playbooks
    pb_ids = [d.doc_id for d in docs]
    assert "PB-TECH-TIMEOUT" in pb_ids
    assert "PB-INSUFFICIENT-FUNDS" in pb_ids
    assert "PB-EXPIRED-CARD" in pb_ids


def test_rag_chunking_with_overlap():
    """Verify document chunker normalizes text and respects size/overlap constraints."""
    chunker = DocumentChunker(chunk_size=100, chunk_overlap=20)
    sample_text = (
        "POL-01-MAX-RETRY: A single transaction invoice shall never exceed 5 total retry attempts. "
        "Any subsequent retries must be blocked and escalated to the customer success team immediately."
    )
    chunks = chunker.chunk_document(doc_id="POL-01", text=sample_text, metadata={"rule": "MAX_RETRY"})
    assert len(chunks) >= 2
    for c in chunks:
        assert len(c["text"]) <= 100
        assert c["doc_id"] == "POL-01"
        assert "metadata" in c


def test_rag_dense_embeddings_normalization():
    """Verify embeddings produce L2 unit-length dense vectors."""
    embedder = EmbeddingModel(vector_dim=64)
    corpus = [
        "UPI payment gateway timeout during evening peak hours",
        "Insufficient funds recurring card payment failure",
        "Expired credit card mandate update portal",
    ]
    embedder.fit(corpus)
    vec = embedder.embed_text("UPI timeout failure")
    assert len(vec) == 64
    # Compute L2 norm: should be ~1.0
    norm = sum(x * x for x in vec) ** 0.5
    assert 0.99 <= norm <= 1.01


def test_rag_vector_store_cosine_search():
    """Verify vector store indexes chunks and ranks by cosine similarity."""
    vstore = VectorStore()
    chunks = [
        {"chunk_id": "c1", "doc_id": "PB-1", "text": "UPI payment gateway timeout", "metadata": {"rail": "upi"}},
        {"chunk_id": "c2", "doc_id": "PB-2", "text": "Insufficient funds salary credit", "metadata": {"rail": "card"}},
    ]
    embedder = EmbeddingModel(vector_dim=32)
    embedder.fit([c["text"] for c in chunks])
    embeddings = embedder.embed_batch([c["text"] for c in chunks])

    vstore.add_chunks(chunks, embeddings)
    assert vstore.count() == 2

    # Query for UPI
    q_vec = embedder.embed_text("UPI timeout")
    results = vstore.search(q_vec, top_k=1)
    assert len(results) == 1
    assert results[0].doc_id == "PB-1"
    assert results[0].score > 0.0


def test_rag_pipeline_end_to_end_grounded_context():
    """Verify end-to-end pipeline returns grounded context string with bracketed citations."""
    pipeline = RAGPipeline(top_k=2)
    pipeline.initialize_index()

    grounded = pipeline.build_grounded_context("UPI timeout failure", top_k=2)
    assert "citations" in grounded
    assert len(grounded["citations"]) >= 1
    assert "[" in grounded["context_text"]
    assert "PB-TECH-TIMEOUT" in grounded["citations"] or "razorpay_payment_recovery_policy" in grounded["citations"]


def test_rag_evaluation_harness_metrics():
    """Verify reproducible RAG evaluation pipeline executes and returns valid metrics."""
    res = run_rag_evaluation(top_k=3)
    metrics = res["metrics"]
    assert metrics["mrr"] >= 0.80
    assert metrics["recall_at_k"] >= 0.80
    assert metrics["precision_at_k"] >= 0.50
    assert metrics["hit_rate_at_k"] >= 0.90
    assert metrics["avg_latency_ms"] < 100.0  # Sub-100ms
