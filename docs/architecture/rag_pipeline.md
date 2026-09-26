# ReviveAI — RAG Pipeline Architecture

This document diagrams the modular Retrieval-Augmented Generation (RAG) architecture used for payment recovery policy compliance, playbook lookup, and grounded reasoning.

```mermaid
flowchart LR
    subgraph Offline ["1. Ingestion & Indexing Pipeline"]
        RawDocs["Policy Documents & Playbooks<br/>(docs/policies/*.md)"]
        Clean["Document Cleaning & Normalization<br/>(src/ai/rag/chunking.py)"]
        Chunker["Sliding Window Chunking<br/><b>Chunk Size: 300 words</b><br/><b>Overlap: 50 words</b>"]
        Vectorize["Subword Tri-gram + Word TF-IDF<br/>(src/ai/rag/embeddings.py)"]
        Store[("In-Memory Vector Store<br/>L2 Normalized Dense Vectors<br/>(src/ai/rag/vector_store.py)")]

        RawDocs --> Clean --> Chunker --> Vectorize --> Store
    end

    subgraph Runtime ["2. Online Retrieval & Generation"]
        Query["Failure Reason & Transaction Context<br/>e.g. 'insufficient_funds retry delay'"]
        EmbedQuery["Vectorize Query with Fitted Vocabulary"]
        Search["Top-K Cosine Similarity Ranking<br/><b>K = 3</b>"]
        Context["Context Construction & Citation Injection<br/>Format: [Doc: Title | Chunk: N]"]
        LLM["Agent Reasoning Engine<br/>(Gemini / OpenAI / Heuristic fallback)"]
        Response["Grounded Recovery Plan<br/>+ Citation Verification"]

        Query --> EmbedQuery
        Store -. Read Index .-> Search
        EmbedQuery --> Search
        Search --> Context
        Context --> LLM
        LLM --> Response
    end

    subgraph Benchmarks ["3. Measured Empirical Metrics"]
        Metrics["<b>Evaluated Performance (42 chunks)</b><br/>• Mean Reciprocal Rank (MRR): 1.0<br/>• Recall@3: 100%<br/>• Precision@3: 75.0%<br/>• Hit Rate: 100%<br/>• Average Retrieval Latency: 2.31 ms"]
    end

    Search -. Monitored by .-> Metrics
```
