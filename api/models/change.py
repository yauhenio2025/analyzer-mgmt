"""Change tracking database models."""

import uuid
from datetime import datetime
from typing import Optional
import enum

from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.database import Base


class ChangeType(str, enum.Enum):
    """Type of change."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class PropagationStatus(str, enum.Enum):
    """Change propagation status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class ActionTaken(str, enum.Enum):
    """Consumer action after notification."""
    UPDATED = "updated"
    IGNORED = "ignored"
    ROLLBACK_REQUESTED = "rollback_requested"
    PENDING = "pending"


class ChangeEvent(Base):
    """Change event tracking.

    Records all changes to engines, paradigms, and pipelines with full diffs.
    """
    __tablename__ = "change_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # What changed
    construct_type: Mapped[str] = mapped_column(String(50), nullable=False)  # engine, paradigm, pipeline
    construct_key: Mapped[str] = mapped_column(String(255), nullable=False)
    change_type: Mapped[str] = mapped_column(String(50), nullable=False)  # create, update, delete

    # Change details
    old_value: Mapped[Optional[dict]] = mapped_column(JSON)
    new_value: Mapped[Optional[dict]] = mapped_column(JSON)
    diff: Mapped[Optional[dict]] = mapped_column(JSON)

    # Metadata
    changed_by: Mapped[Optional[str]] = mapped_column(String(255))
    change_summary: Mapped[Optional[str]] = mapped_column(Text)

    # Propagation
    propagation_status: Mapped[str] = mapped_column(String(50), default="pending")
    affected_consumers: Mapped[list] = mapped_column(JSON, default=list)

    # Timestamp
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    notifications: Mapped[list["ChangeNotification"]] = relationship(
        "ChangeNotification", back_populates="change_event", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "construct_type": self.construct_type,
            "construct_key": self.construct_key,
            "change_type": self.change_type,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "diff": self.diff,
            "changed_by": self.changed_by,
            "change_summary": self.change_summary,
            "propagation_status": self.propagation_status,
            "affected_consumers": self.affected_consumers,
            "changed_at": self.changed_at.isoformat() if self.changed_at else None,
            "notification_count": len(self.notifications) if self.notifications else 0,
        }

    def to_summary(self) -> dict:
        """Convert to summary dict."""
        return {
            "id": str(self.id),
            "construct_type": self.construct_type,
            "construct_key": self.construct_key,
            "change_type": self.change_type,
            "changed_by": self.changed_by,
            "change_summary": self.change_summary,
            "propagation_status": self.propagation_status,
            "changed_at": self.changed_at.isoformat() if self.changed_at else None,
        }


class ChangeNotification(Base):
    """Change notification tracking.

    Records notifications sent to consumers and their responses.
    """
    __tablename__ = "change_notifications"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    change_event_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("change_events.id", ondelete="CASCADE")
    )
    consumer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("consumers.id", ondelete="CASCADE")
    )

    # Notification status
    notified_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    action_taken: Mapped[str] = mapped_column(String(50), default="pending")

    # Response details
    response_message: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    change_event: Mapped["ChangeEvent"] = relationship("ChangeEvent", back_populates="notifications")

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "change_event_id": str(self.change_event_id),
            "consumer_id": str(self.consumer_id),
            "notified_at": self.notified_at.isoformat() if self.notified_at else None,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "action_taken": self.action_taken,
            "response_message": self.response_message,
        }
