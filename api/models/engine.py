"""Engine database models."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from models.database import Base


class EngineKind(str, enum.Enum):
    """Type of analysis engine."""
    PRIMITIVE = "primitive"
    RELATIONAL = "relational"
    SYNTHESIS = "synthesis"
    EXTRACTION = "extraction"
    COMPARISON = "comparison"


class EngineCategory(str, enum.Enum):
    """Semantic category for engine organization."""
    ARGUMENT = "argument"
    EPISTEMOLOGY = "epistemology"
    METHODOLOGY = "methodology"
    SYSTEMS = "systems"
    CONCEPTS = "concepts"
    EVIDENCE = "evidence"
    TEMPORAL = "temporal"
    POWER = "power"
    INSTITUTIONAL = "institutional"
    MARKET = "market"
    RHETORIC = "rhetoric"
    SCHOLARLY = "scholarly"


class EngineStatus(str, enum.Enum):
    """Engine status."""
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    DRAFT = "draft"
    ARCHIVED = "archived"


class Engine(Base):
    """Engine definition model.

    Stores analytical engine definitions with full versioning support.
    """
    __tablename__ = "engines"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    engine_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Identity
    engine_name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Classification
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    kind: Mapped[str] = mapped_column(String(50), default="primitive")
    reasoning_domain: Mapped[Optional[str]] = mapped_column(String(255))
    researcher_question: Mapped[Optional[str]] = mapped_column(Text)

    # Stage context (NEW - replaces individual prompt columns)
    # Contains engine-specific context for stage template composition
    stage_context: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Legacy prompts (kept for backwards compatibility during migration)
    # Will be removed after migration to stage_context is complete
    extraction_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    curation_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    concretization_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Schema and focus
    canonical_schema: Mapped[dict] = mapped_column(JSON, nullable=False)
    extraction_focus: Mapped[list] = mapped_column(JSON, default=list)

    # Output compatibility
    primary_output_modes: Mapped[list] = mapped_column(JSON, default=list)

    # Paradigm associations
    paradigm_keys: Mapped[list] = mapped_column(JSON, default=list)

    # Status
    status: Mapped[str] = mapped_column(String(50), default="active")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    versions: Mapped[list["EngineVersion"]] = relationship(
        "EngineVersion", back_populates="engine", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "engine_key": self.engine_key,
            "engine_name": self.engine_name,
            "description": self.description,
            "version": self.version,
            "category": self.category,
            "kind": self.kind,
            "reasoning_domain": self.reasoning_domain,
            "researcher_question": self.researcher_question,
            "stage_context": self.stage_context,
            # Legacy prompts (for backwards compatibility)
            "extraction_prompt": self.extraction_prompt,
            "curation_prompt": self.curation_prompt,
            "concretization_prompt": self.concretization_prompt,
            "canonical_schema": self.canonical_schema,
            "extraction_focus": self.extraction_focus,
            "primary_output_modes": self.primary_output_modes,
            "paradigm_keys": self.paradigm_keys,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_summary(self) -> dict:
        """Convert to summary dict for listings."""
        return {
            "engine_key": self.engine_key,
            "engine_name": self.engine_name,
            "description": self.description[:200] + "..." if len(self.description) > 200 else self.description,
            "version": self.version,
            "category": self.category,
            "kind": self.kind,
            "paradigm_keys": self.paradigm_keys,
            "status": self.status,
            "has_stage_context": self.stage_context is not None,
        }

    @property
    def has_stage_context(self) -> bool:
        """Check if engine has stage_context for prompt composition."""
        return self.stage_context is not None


class EngineVersion(Base):
    """Engine version history.

    Stores complete snapshots of engine definitions for version control.
    """
    __tablename__ = "engine_versions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    engine_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("engines.id", ondelete="CASCADE")
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)

    # Full snapshot
    full_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Change metadata
    change_summary: Mapped[Optional[str]] = mapped_column(Text)
    changed_by: Mapped[Optional[str]] = mapped_column(String(255))

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    engine: Mapped["Engine"] = relationship("Engine", back_populates="versions")

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "engine_id": str(self.engine_id),
            "version": self.version,
            "full_snapshot": self.full_snapshot,
            "change_summary": self.change_summary,
            "changed_by": self.changed_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
