"""Consumer registry database models."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.database import Base


class Consumer(Base):
    """Consumer service registry.

    Tracks services that depend on engine/paradigm definitions.
    """
    __tablename__ = "consumers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Identity
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    consumer_type: Mapped[str] = mapped_column(String(50), nullable=False)  # service, cli, library

    # Connection details
    repo_url: Mapped[Optional[str]] = mapped_column(String(500))
    webhook_url: Mapped[Optional[str]] = mapped_column(String(500))
    contact_email: Mapped[Optional[str]] = mapped_column(String(255))

    # Configuration
    auto_update: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    dependencies: Mapped[list["ConsumerDependency"]] = relationship(
        "ConsumerDependency", back_populates="consumer", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "consumer_type": self.consumer_type,
            "repo_url": self.repo_url,
            "webhook_url": self.webhook_url,
            "contact_email": self.contact_email,
            "auto_update": self.auto_update,
            "dependency_count": len(self.dependencies) if self.dependencies else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_summary(self) -> dict:
        """Convert to summary dict."""
        return {
            "id": str(self.id),
            "name": self.name,
            "consumer_type": self.consumer_type,
            "auto_update": self.auto_update,
            "dependency_count": len(self.dependencies) if self.dependencies else 0,
        }


class ConsumerDependency(Base):
    """Consumer dependency tracking.

    Records which constructs (engines, paradigms, chains) each consumer depends on.
    """
    __tablename__ = "consumer_dependencies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    consumer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consumers.id", ondelete="CASCADE")
    )

    # What is depended upon
    construct_type: Mapped[str] = mapped_column(String(50), nullable=False)  # engine, paradigm, pipeline
    construct_key: Mapped[str] = mapped_column(String(255), nullable=False)

    # Usage details
    usage_location: Mapped[Optional[str]] = mapped_column(Text)  # file path, module name
    usage_type: Mapped[str] = mapped_column(String(50), default="direct")  # direct, indirect, optional

    # Tracking
    discovered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_verified: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    consumer: Mapped["Consumer"] = relationship("Consumer", back_populates="dependencies")

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "consumer_id": str(self.consumer_id),
            "construct_type": self.construct_type,
            "construct_key": self.construct_key,
            "usage_location": self.usage_location,
            "usage_type": self.usage_type,
            "discovered_at": self.discovered_at.isoformat() if self.discovered_at else None,
            "last_verified": self.last_verified.isoformat() if self.last_verified else None,
            "is_active": self.is_active,
        }
