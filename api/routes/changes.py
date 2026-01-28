"""Change tracking and propagation API routes."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from models.database import get_db
from models.change import ChangeEvent, ChangeNotification
from models.consumer import ConsumerDependency, Consumer

router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================


class ChangeEventCreate(BaseModel):
    """Schema for creating a change event."""
    construct_type: str
    construct_key: str
    change_type: str
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    diff: Optional[dict] = None
    changed_by: Optional[str] = None
    change_summary: Optional[str] = None


class PropagateRequest(BaseModel):
    """Schema for propagation request."""
    notify_only: bool = Field(default=False, description="Only notify, don't auto-update")


class MigrationHint(BaseModel):
    """Schema for migration hint response."""
    engine_key: str
    change: str
    migration_type: str  # additive, breaking, rename, removal
    consumer_action: str  # none_required, recommended, required
    notes: str
    migration_script: Optional[str] = None


# ============================================================================
# Routes
# ============================================================================


@router.get("")
async def list_changes(
    construct_type: Optional[str] = Query(None, description="Filter by construct type"),
    construct_key: Optional[str] = Query(None, description="Filter by construct key"),
    change_type: Optional[str] = Query(None, description="Filter by change type"),
    status: Optional[str] = Query(None, description="Filter by propagation status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List change events with filtering."""
    query = select(ChangeEvent)

    if construct_type:
        query = query.where(ChangeEvent.construct_type == construct_type)
    if construct_key:
        query = query.where(ChangeEvent.construct_key == construct_key)
    if change_type:
        query = query.where(ChangeEvent.change_type == change_type)
    if status:
        query = query.where(ChangeEvent.propagation_status == status)

    # Order by most recent first
    query = query.order_by(desc(ChangeEvent.changed_at)).offset(offset).limit(limit)

    result = await db.execute(query)
    changes = result.scalars().all()

    return {
        "changes": [c.to_summary() for c in changes],
        "limit": limit,
        "offset": offset,
    }


@router.get("/{change_id}")
async def get_change(
    change_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a specific change event with full details."""
    try:
        uuid = UUID(change_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid change ID format")

    query = (
        select(ChangeEvent)
        .options(selectinload(ChangeEvent.notifications))
        .where(ChangeEvent.id == uuid)
    )
    result = await db.execute(query)
    change = result.scalar_one_or_none()

    if not change:
        raise HTTPException(status_code=404, detail="Change event not found")

    return change.to_dict()


@router.get("/{change_id}/notifications")
async def get_change_notifications(
    change_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get all notifications for a change event."""
    try:
        uuid = UUID(change_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid change ID format")

    query = select(ChangeNotification).where(ChangeNotification.change_event_id == uuid)
    result = await db.execute(query)
    notifications = result.scalars().all()

    return {
        "change_id": change_id,
        "notifications": [n.to_dict() for n in notifications],
        "total": len(notifications),
    }


@router.post("")
async def record_change(
    change_data: ChangeEventCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Record a new change event."""
    # Find affected consumers
    dep_query = select(ConsumerDependency).where(
        ConsumerDependency.construct_type == change_data.construct_type,
        ConsumerDependency.construct_key == change_data.construct_key,
        ConsumerDependency.is_active == True,
    )
    dep_result = await db.execute(dep_query)
    dependencies = dep_result.scalars().all()

    affected_consumer_ids = list(set(str(d.consumer_id) for d in dependencies))

    change = ChangeEvent(
        construct_type=change_data.construct_type,
        construct_key=change_data.construct_key,
        change_type=change_data.change_type,
        old_value=change_data.old_value,
        new_value=change_data.new_value,
        diff=change_data.diff,
        changed_by=change_data.changed_by,
        change_summary=change_data.change_summary,
        affected_consumers=affected_consumer_ids,
    )
    db.add(change)
    await db.flush()

    return change.to_dict()


@router.post("/{change_id}/propagate")
async def propagate_change(
    change_id: str,
    request: PropagateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Propagate a change to affected consumers."""
    try:
        uuid = UUID(change_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid change ID format")

    query = select(ChangeEvent).where(ChangeEvent.id == uuid)
    result = await db.execute(query)
    change = result.scalar_one_or_none()

    if not change:
        raise HTTPException(status_code=404, detail="Change event not found")

    # Update status
    change.propagation_status = "in_progress"

    # Create notifications for each affected consumer
    notifications_created = []
    for consumer_id in change.affected_consumers:
        try:
            consumer_uuid = UUID(consumer_id)

            # Get consumer for webhook URL
            consumer_query = select(Consumer).where(Consumer.id == consumer_uuid)
            consumer_result = await db.execute(consumer_query)
            consumer = consumer_result.scalar_one_or_none()

            if consumer:
                notification = ChangeNotification(
                    change_event_id=change.id,
                    consumer_id=consumer_uuid,
                    notified_at=datetime.utcnow(),
                    action_taken="pending",
                )
                db.add(notification)
                notifications_created.append({
                    "consumer_name": consumer.name,
                    "webhook_url": consumer.webhook_url,
                    "auto_update": consumer.auto_update and not request.notify_only,
                })

                # TODO: Actually send webhook notification
                # if consumer.webhook_url:
                #     await send_webhook(consumer.webhook_url, change.to_dict())

        except ValueError:
            continue

    change.propagation_status = "completed"

    return {
        "change_id": change_id,
        "propagation_status": "completed",
        "notifications_sent": len(notifications_created),
        "notifications": notifications_created,
    }


@router.post("/{change_id}/notifications/{consumer_id}/acknowledge")
async def acknowledge_notification(
    change_id: str,
    consumer_id: str,
    action: str = Query(..., description="Action taken: updated, ignored, rollback_requested"),
    message: Optional[str] = Query(None, description="Optional response message"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Acknowledge a change notification from a consumer."""
    try:
        change_uuid = UUID(change_id)
        consumer_uuid = UUID(consumer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    query = select(ChangeNotification).where(
        ChangeNotification.change_event_id == change_uuid,
        ChangeNotification.consumer_id == consumer_uuid,
    )
    result = await db.execute(query)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if action not in ["updated", "ignored", "rollback_requested"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    notification.acknowledged_at = datetime.utcnow()
    notification.action_taken = action
    notification.response_message = message

    return notification.to_dict()


@router.get("/{change_id}/migration-hints")
async def get_migration_hints(
    change_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get migration hints for a change."""
    try:
        uuid = UUID(change_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid change ID format")

    query = select(ChangeEvent).where(ChangeEvent.id == uuid)
    result = await db.execute(query)
    change = result.scalar_one_or_none()

    if not change:
        raise HTTPException(status_code=404, detail="Change event not found")

    # Analyze the change and generate migration hints
    hints = []

    if change.diff and change.construct_type == "engine":
        diff = change.diff

        # Check for schema changes
        if "canonical_schema" in diff:
            old_schema = change.old_value.get("canonical_schema", {}) if change.old_value else {}
            new_schema = change.new_value.get("canonical_schema", {}) if change.new_value else {}

            # Simple diff analysis - in production, use a proper JSON diff library
            if new_schema and old_schema:
                # Check for added fields
                new_fields = set(str(new_schema.keys())) - set(str(old_schema.keys()))
                if new_fields:
                    hints.append({
                        "engine_key": change.construct_key,
                        "change": f"Added schema fields: {', '.join(new_fields)}",
                        "migration_type": "additive",
                        "consumer_action": "none_required",
                        "notes": "New optional fields added, existing code unaffected",
                    })

                # Check for removed fields
                removed_fields = set(str(old_schema.keys())) - set(str(new_schema.keys()))
                if removed_fields:
                    hints.append({
                        "engine_key": change.construct_key,
                        "change": f"Removed schema fields: {', '.join(removed_fields)}",
                        "migration_type": "breaking",
                        "consumer_action": "required",
                        "notes": "Fields removed - consumers must update code that references these fields",
                    })

        # Check for prompt changes
        for prompt_type in ["extraction_prompt", "curation_prompt", "concretization_prompt"]:
            if prompt_type in diff:
                hints.append({
                    "engine_key": change.construct_key,
                    "change": f"Updated {prompt_type.replace('_', ' ')}",
                    "migration_type": "compatible",
                    "consumer_action": "recommended",
                    "notes": "Prompt updated - consumers should verify outputs still meet expectations",
                })

    if not hints:
        hints.append({
            "engine_key": change.construct_key,
            "change": change.change_summary or "General update",
            "migration_type": "compatible",
            "consumer_action": "recommended",
            "notes": "Review changes to ensure compatibility with your use case",
        })

    return {
        "change_id": change_id,
        "construct_type": change.construct_type,
        "construct_key": change.construct_key,
        "hints": hints,
    }


@router.get("/construct/{construct_type}/{construct_key}")
async def get_construct_history(
    construct_type: str,
    construct_key: str,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get change history for a specific construct."""
    query = (
        select(ChangeEvent)
        .where(
            ChangeEvent.construct_type == construct_type,
            ChangeEvent.construct_key == construct_key,
        )
        .order_by(desc(ChangeEvent.changed_at))
        .limit(limit)
    )
    result = await db.execute(query)
    changes = result.scalars().all()

    return {
        "construct_type": construct_type,
        "construct_key": construct_key,
        "changes": [c.to_summary() for c in changes],
        "total": len(changes),
    }
