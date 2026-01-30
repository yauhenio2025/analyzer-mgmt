"""Grid database models for strategy grid management."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.database import Base


class Grid(Base):
    """Strategy grid definition.

    Each grid represents a track's dimensions (conditions x axes).
    Follows the Engine/EngineVersion versioning pattern.
    """
    __tablename__ = "grids"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    grid_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    grid_name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    track: Mapped[str] = mapped_column(String(50), nullable=False)  # "ideas" or "process"

    # Dimensions stored as rich objects: [{name, description, added_version}]
    conditions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    axes: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Versioning
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    versions: Mapped[list["GridVersion"]] = relationship(
        "GridVersion", back_populates="grid", cascade="all, delete-orphan",
        order_by="GridVersion.version.desc()"
    )
    wildcard_suggestions: Mapped[list["WildcardSuggestion"]] = relationship(
        "WildcardSuggestion", back_populates="grid", cascade="all, delete-orphan",
        order_by="WildcardSuggestion.created_at.desc()"
    )

    def to_dict(self) -> dict:
        """Full serialization."""
        return {
            "id": self.id,
            "grid_key": self.grid_key,
            "grid_name": self.grid_name,
            "description": self.description,
            "track": self.track,
            "conditions": self.conditions,
            "axes": self.axes,
            "version": self.version,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_summary(self) -> dict:
        """Summary for list views."""
        return {
            "grid_key": self.grid_key,
            "grid_name": self.grid_name,
            "track": self.track,
            "condition_count": len(self.conditions) if self.conditions else 0,
            "axis_count": len(self.axes) if self.axes else 0,
            "version": self.version,
            "status": self.status,
        }

    def to_dimensions(self) -> dict:
        """Consumer endpoint format: string[] only."""
        import hashlib
        condition_names = [c["name"] if isinstance(c, dict) else c for c in (self.conditions or [])]
        axis_names = [a["name"] if isinstance(a, dict) else a for a in (self.axes or [])]
        content = "|".join(condition_names + axis_names)
        dimension_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        return {
            "grid_key": self.grid_key,
            "version": self.version,
            "conditions": condition_names,
            "axes": axis_names,
            "dimension_hash": dimension_hash,
        }


class GridVersion(Base):
    """Snapshot of a grid at a specific version."""
    __tablename__ = "grid_versions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    grid_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("grids.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    full_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    change_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    grid: Mapped["Grid"] = relationship("Grid", back_populates="versions")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "grid_id": self.grid_id,
            "version": self.version,
            "full_snapshot": self.full_snapshot,
            "change_summary": self.change_summary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class WildcardSuggestion(Base):
    """A suggested new dimension from a consumer project."""
    __tablename__ = "wildcard_suggestions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    grid_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("grids.id", ondelete="CASCADE"), nullable=False, index=True
    )
    dimension_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "condition" or "axis"
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    rationale: Mapped[str] = mapped_column(Text, nullable=False, default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Scope and provenance
    scope: Mapped[str] = mapped_column(String(50), default="project_specific", nullable=False)  # "universal" or "project_specific"
    source_project: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_session_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    evidence_questions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Review status
    status: Mapped[str] = mapped_column(String(50), default="suggested", nullable=False)  # suggested/review/promoted/rejected

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    grid: Mapped["Grid"] = relationship("Grid", back_populates="wildcard_suggestions")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "grid_id": self.grid_id,
            "dimension_type": self.dimension_type,
            "name": self.name,
            "description": self.description,
            "rationale": self.rationale,
            "confidence": self.confidence,
            "scope": self.scope,
            "source_project": self.source_project,
            "source_session_id": self.source_session_id,
            "evidence_questions": self.evidence_questions,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
