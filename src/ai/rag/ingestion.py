"""
ReviveAI — RAG Document Ingestion Layer

Ingests regulatory policies, gateway guidelines, and recovery playbooks
into structured document objects with rich domain metadata.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
import os

from src.ai.rag_playbooks import RECOVERY_PLAYBOOKS


@dataclass
class Document:
    """Represents an ingested raw document before chunking."""
    doc_id: str
    title: str
    content: str
    category: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class DocumentIngestion:
    """Ingests policy documents and domain playbooks into unified Document models."""

    def __init__(self, policy_dir: Optional[str] = None):
        self.policy_dir = policy_dir or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            "docs",
            "policies",
        )

    def load_playbooks(self) -> List[Document]:
        """Convert standard domain playbooks into Document objects."""
        docs: List[Document] = []
        for pb in RECOVERY_PLAYBOOKS:
            content = (
                f"Title: {pb.get('title')}\n"
                f"Category: {pb.get('category')}\n"
                f"Failure Reason: {pb.get('failure_reason')}\n"
                f"Payment Method: {pb.get('payment_method')}\n"
                f"Action: {pb.get('recommended_action')}\n"
                f"Recommended Delay: {pb.get('recommended_delay_hours')} hours\n"
                f"Historical Probability: {pb.get('historical_benchmark_prob')}\n"
                f"Playbook Details: {pb.get('playbook')}"
            )
            docs.append(Document(
                doc_id=pb["id"],
                title=pb.get("title", pb["id"]),
                content=content,
                category=pb.get("category", "playbook"),
                metadata={
                    "type": "playbook",
                    "failure_reason": pb.get("failure_reason"),
                    "payment_method": pb.get("payment_method"),
                    "recommended_action": pb.get("recommended_action"),
                    "recommended_delay_hours": pb.get("recommended_delay_hours"),
                    "benchmark_prob": pb.get("historical_benchmark_prob"),
                },
            ))
        return docs

    def load_policy_files(self) -> List[Document]:
        """Read and parse markdown policy documents from docs/policies/."""
        docs: List[Document] = []
        p_path = Path(self.policy_dir)
        if not p_path.exists():
            return docs

        for file_path in p_path.glob("*.md"):
            try:
                text = file_path.read_text(encoding="utf-8")
                doc_id = file_path.stem
                title = file_path.stem.replace("_", " ").title()
                # Extract first markdown header if available
                for line in text.splitlines():
                    if line.startswith("# "):
                        title = line.replace("# ", "").strip()
                        break

                docs.append(Document(
                    doc_id=doc_id,
                    title=title,
                    content=text,
                    category="regulatory_policy",
                    metadata={
                        "type": "policy",
                        "source_file": file_path.name,
                    },
                ))
            except Exception:
                continue

        return docs

    def load_all(self) -> List[Document]:
        """Load both recovery playbooks and policy markdown files."""
        return self.load_playbooks() + self.load_policy_files()
