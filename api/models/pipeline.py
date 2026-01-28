"""Pipeline database models."""

import uuid
from datetime import datetime
from typing import Optional
import enum

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.database import Base


class BlendMode(str, enum.Enum):
    """How stages in a pipeline combine their outputs."""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    MERGE = "merge"
    LLM_SELECTION = "llm_selection"


class Pipeline(Base):
    """Pipeline definition model.

    Stores multi-stage analysis pipeline definitions.
    """
    __tablename__ = "pipelines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    pipeline_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)

    # Identity
    pipeline_name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Configuration
    stage_definitions: Mapped[list] = mapped_column(JSONB, default=list)
    blend_mode: Mapped[str] = mapped_column(String(50), default="sequential")
    category: Mapped[Optional[str]] = mapped_column(String(100))

    # Status
    status: Mapped[str] = mapped_column(String(50), default="active")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    stages: Mapped[list["PipelineStage"]] = relationship(
        "PipelineStage", back_populates="pipeline", cascade="all, delete-orphan",
        order_by="PipelineStage.stage_order"
    )

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "pipeline_key": self.pipeline_key,
            "pipeline_name": self.pipeline_name,
            "description": self.description,
            "stage_definitions": self.stage_definitions,
            "blend_mode": self.blend_mode,
            "category": self.category,
            "status": self.status,
            "stages": [s.to_dict() for s in self.stages] if self.stages else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_summary(self) -> dict:
        """Convert to summary dict for listings."""
        return {
            "pipeline_key": self.pipeline_key,
            "pipeline_name": self.pipeline_name,
            "description": self.description[:200] + "..." if len(self.description) > 200 else self.description,
            "blend_mode": self.blend_mode,
            "category": self.category,
            "stage_count": len(self.stages) if self.stages else len(self.stage_definitions),
            "status": self.status,
        }


class PipelineStage(Base):
    """Pipeline stage definition.

    Represents a single stage in a pipeline with engine assignment and configuration.
    """
    __tablename__ = "pipeline_stages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    pipeline_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pipelines.id", ondelete="CASCADE")
    )

    # Ordering
    stage_order: Mapped[int] = mapped_column(Integer, nullable=False)
    stage_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Engine assignment (can be null if sub-pipeline)
    engine_key: Mapped[Optional[str]] = mapped_column(String(255))

    # Nested pipeline support
    sub_pipeline_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))

    # Stage blend mode (for sub-passes)
    blend_mode: Mapped[Optional[str]] = mapped_column(String(50))

    # Sub-pass engine keys (for stages with multiple engines)
    sub_pass_engine_keys: Mapped[list] = mapped_column(JSONB, default=list)

    # Context passing
    pass_context: Mapped[bool] = mapped_column(Boolean, default=True)

    # Stage-specific configuration
    config: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Relationships
    pipeline: Mapped["Pipeline"] = relationship("Pipeline", back_populates="stages")

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "pipeline_id": str(self.pipeline_id),
            "stage_order": self.stage_order,
            "stage_name": self.stage_name,
            "engine_key": self.engine_key,
            "sub_pipeline_id": str(self.sub_pipeline_id) if self.sub_pipeline_id else None,
            "blend_mode": self.blend_mode,
            "sub_pass_engine_keys": self.sub_pass_engine_keys,
            "pass_context": self.pass_context,
            "config": self.config,
        }
