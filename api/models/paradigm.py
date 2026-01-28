"""Paradigm database models."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column

from models.database import Base


class Paradigm(Base):
    """Paradigm definition model.

    Stores 4-layer ontology paradigm definitions with traits and critique patterns.
    """
    __tablename__ = "paradigms"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    paradigm_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(50), default="1.0.0")

    # Identity
    paradigm_name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    guiding_thinkers: Mapped[str] = mapped_column(Text, nullable=False)

    # 4-Layer Ontology (stored as JSON)
    foundational: Mapped[dict] = mapped_column(JSON, nullable=False)
    structural: Mapped[dict] = mapped_column(JSON, nullable=False)
    dynamic: Mapped[dict] = mapped_column(JSON, nullable=False)
    explanatory: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Traits
    active_traits: Mapped[list] = mapped_column(JSON, default=list)
    trait_definitions: Mapped[list] = mapped_column(JSON, default=list)

    # Critique patterns
    critique_patterns: Mapped[list] = mapped_column(JSON, default=list)

    # Metadata
    historical_context: Mapped[Optional[str]] = mapped_column(Text)
    related_paradigms: Mapped[list] = mapped_column(JSON, default=list)

    # Engine associations
    primary_engines: Mapped[list] = mapped_column(JSON, default=list)
    compatible_engines: Mapped[list] = mapped_column(JSON, default=list)

    # Status
    status: Mapped[str] = mapped_column(String(50), default="active")

    # Branching fields
    parent_paradigm_key: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, index=True
    )
    branch_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    branch_depth: Mapped[int] = mapped_column(Integer, default=0)
    generation_status: Mapped[str] = mapped_column(String(50), default="complete")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "paradigm_key": self.paradigm_key,
            "paradigm_name": self.paradigm_name,
            "version": self.version,
            "description": self.description,
            "guiding_thinkers": self.guiding_thinkers,
            "foundational": self.foundational,
            "structural": self.structural,
            "dynamic": self.dynamic,
            "explanatory": self.explanatory,
            "active_traits": self.active_traits,
            "trait_definitions": self.trait_definitions,
            "critique_patterns": self.critique_patterns,
            "historical_context": self.historical_context,
            "related_paradigms": self.related_paradigms,
            "primary_engines": self.primary_engines,
            "compatible_engines": self.compatible_engines,
            "status": self.status,
            "parent_paradigm_key": self.parent_paradigm_key,
            "branch_metadata": self.branch_metadata,
            "branch_depth": self.branch_depth,
            "generation_status": self.generation_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_summary(self) -> dict:
        """Convert to summary dict for listings."""
        return {
            "paradigm_key": self.paradigm_key,
            "paradigm_name": self.paradigm_name,
            "version": self.version,
            "description": self.description[:200] + "..." if len(self.description) > 200 else self.description,
            "guiding_thinkers": self.guiding_thinkers,
            "active_traits": self.active_traits,
            "status": self.status,
            "engine_count": len(self.primary_engines or []) + len(self.compatible_engines or []),
            "parent_paradigm_key": self.parent_paradigm_key,
            "branch_depth": self.branch_depth,
            "generation_status": self.generation_status,
        }

    def get_layer(self, layer_name: str) -> dict:
        """Get a specific ontology layer."""
        layers = {
            "foundational": self.foundational,
            "structural": self.structural,
            "dynamic": self.dynamic,
            "explanatory": self.explanatory,
        }
        return layers.get(layer_name, {})

    def generate_primer(self) -> str:
        """Generate LLM-ready primer text from paradigm definition."""
        sections = []

        sections.append(f"# {self.paradigm_name} Paradigm")
        sections.append(f"\n{self.description}\n")
        sections.append(f"**Guiding Thinkers**: {self.guiding_thinkers}\n")

        # Foundational
        sections.append("## Foundational Layer")
        if self.foundational.get("assumptions"):
            sections.append("\n### Core Assumptions")
            for assumption in self.foundational["assumptions"]:
                sections.append(f"- {assumption}")
        if self.foundational.get("core_tensions"):
            sections.append("\n### Core Tensions")
            for tension in self.foundational["core_tensions"]:
                sections.append(f"- {tension}")

        # Structural
        sections.append("\n## Structural Layer")
        if self.structural.get("primary_entities"):
            sections.append("\n### Primary Entities")
            for entity in self.structural["primary_entities"]:
                sections.append(f"- {entity}")
        if self.structural.get("relations"):
            sections.append("\n### Relations")
            for relation in self.structural["relations"]:
                sections.append(f"- {relation}")

        # Dynamic
        sections.append("\n## Dynamic Layer")
        if self.dynamic.get("change_mechanisms"):
            sections.append("\n### Change Mechanisms")
            for mechanism in self.dynamic["change_mechanisms"]:
                sections.append(f"- {mechanism}")

        # Explanatory
        sections.append("\n## Explanatory Layer")
        if self.explanatory.get("key_concepts"):
            sections.append("\n### Key Concepts")
            for concept in self.explanatory["key_concepts"]:
                sections.append(f"- {concept}")
        if self.explanatory.get("analytical_methods"):
            sections.append("\n### Analytical Methods")
            for method in self.explanatory["analytical_methods"]:
                sections.append(f"- {method}")

        return "\n".join(sections)
