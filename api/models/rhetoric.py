"""Rhetoric analyzer database models."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from models.database import Base


class RhetoricCategory(str, enum.Enum):
    """Category for rhetoric analyzer organization."""
    RHETORIC = "rhetoric"           # Round 1: Analyze subject's response
    VULNERABILITY = "vulnerability"  # Round 2: Analyze user's counter-response


class RhetoricStatus(str, enum.Enum):
    """Rhetoric analyzer status."""
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    DRAFT = "draft"
    ARCHIVED = "archived"


class Rhetoric(Base):
    """Rhetoric analyzer definition model.

    Stores rhetoric analyzer definitions with prompts, document requirements,
    and model settings. Supports full versioning.
    """
    __tablename__ = "rhetoric"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    rhetoric_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Identity
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Classification
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # rhetoric | vulnerability

    # Prompt content
    prompt_template: Mapped[str] = mapped_column(Text, nullable=False)
    output_schema: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Document requirements
    requires_subject: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_critique: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_response: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_counter_response: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Model settings
    model: Mapped[str] = mapped_column(String(100), default="claude-opus-4-5-20251101", nullable=False)
    thinking_budget: Mapped[int] = mapped_column(Integer, default=32000, nullable=False)
    max_tokens: Mapped[int] = mapped_column(Integer, default=64000, nullable=False)

    # Status
    status: Mapped[str] = mapped_column(String(50), default="active")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    versions: Mapped[list["RhetoricVersion"]] = relationship(
        "RhetoricVersion", back_populates="rhetoric", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "rhetoric_key": self.rhetoric_key,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "category": self.category,
            "prompt_template": self.prompt_template,
            "output_schema": self.output_schema,
            "requires_subject": self.requires_subject,
            "requires_critique": self.requires_critique,
            "requires_response": self.requires_response,
            "requires_counter_response": self.requires_counter_response,
            "model": self.model,
            "thinking_budget": self.thinking_budget,
            "max_tokens": self.max_tokens,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_summary(self) -> dict:
        """Convert to summary dict for listings."""
        requirements = []
        if self.requires_subject:
            requirements.append("Subject")
        if self.requires_critique:
            requirements.append("Critique")
        if self.requires_response:
            requirements.append("Response")
        if self.requires_counter_response:
            requirements.append("Counter-Response")

        return {
            "rhetoric_key": self.rhetoric_key,
            "name": self.name,
            "description": self.description[:200] + "..." if len(self.description) > 200 else self.description,
            "version": self.version,
            "category": self.category,
            "status": self.status,
            "document_requirements": requirements,
            "model": self.model,
            "thinking_budget": self.thinking_budget,
        }

    def get_document_requirements(self) -> list[str]:
        """Get list of required document types."""
        requirements = []
        if self.requires_subject:
            requirements.append("subject")
        if self.requires_critique:
            requirements.append("critique")
        if self.requires_response:
            requirements.append("response")
        if self.requires_counter_response:
            requirements.append("counter_response")
        return requirements


class RhetoricVersion(Base):
    """Rhetoric analyzer version history.

    Stores complete snapshots of rhetoric analyzer definitions for version control.
    """
    __tablename__ = "rhetoric_versions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    rhetoric_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rhetoric.id", ondelete="CASCADE")
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
    rhetoric: Mapped["Rhetoric"] = relationship("Rhetoric", back_populates="versions")

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "rhetoric_id": str(self.rhetoric_id),
            "version": self.version,
            "full_snapshot": self.full_snapshot,
            "change_summary": self.change_summary,
            "changed_by": self.changed_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
