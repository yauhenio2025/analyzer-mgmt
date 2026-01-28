"""Consumer registry API routes."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from models.database import get_db
from models.consumer import Consumer, ConsumerDependency

router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================


class DependencyCreate(BaseModel):
    """Schema for creating a dependency."""
    construct_type: str  # engine, paradigm, pipeline
    construct_key: str
    usage_location: Optional[str] = None
    usage_type: str = "direct"


class ConsumerCreate(BaseModel):
    """Schema for creating a consumer."""
    name: str = Field(..., min_length=1, max_length=255)
    consumer_type: str  # service, cli, library
    repo_url: Optional[str] = None
    webhook_url: Optional[str] = None
    contact_email: Optional[str] = None
    auto_update: bool = False
    dependencies: list[DependencyCreate] = Field(default_factory=list)


class ConsumerUpdate(BaseModel):
    """Schema for updating a consumer."""
    name: Optional[str] = None
    consumer_type: Optional[str] = None
    repo_url: Optional[str] = None
    webhook_url: Optional[str] = None
    contact_email: Optional[str] = None
    auto_update: Optional[bool] = None


# ============================================================================
# Routes
# ============================================================================


@router.get("")
async def list_consumers(
    consumer_type: Optional[str] = Query(None, description="Filter by type"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all registered consumers."""
    query = select(Consumer).options(selectinload(Consumer.dependencies))

    if consumer_type:
        query = query.where(Consumer.consumer_type == consumer_type)

    result = await db.execute(query.order_by(Consumer.name))
    consumers = result.scalars().all()

    return {
        "consumers": [c.to_dict() for c in consumers],
        "total": len(consumers),
    }


@router.get("/{consumer_id}")
async def get_consumer(
    consumer_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a specific consumer by ID."""
    try:
        uuid = UUID(consumer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid consumer ID format")

    query = (
        select(Consumer)
        .options(selectinload(Consumer.dependencies))
        .where(Consumer.id == uuid)
    )
    result = await db.execute(query)
    consumer = result.scalar_one_or_none()

    if not consumer:
        raise HTTPException(status_code=404, detail=f"Consumer not found")

    return consumer.to_dict()


@router.get("/{consumer_id}/dependencies")
async def get_consumer_dependencies(
    consumer_id: str,
    construct_type: Optional[str] = Query(None, description="Filter by construct type"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get all dependencies for a consumer."""
    try:
        uuid = UUID(consumer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid consumer ID format")

    query = select(ConsumerDependency).where(ConsumerDependency.consumer_id == uuid)

    if construct_type:
        query = query.where(ConsumerDependency.construct_type == construct_type)

    result = await db.execute(query)
    dependencies = result.scalars().all()

    return {
        "consumer_id": consumer_id,
        "dependencies": [d.to_dict() for d in dependencies],
        "total": len(dependencies),
    }


@router.get("/by-construct/{construct_type}/{construct_key}")
async def get_consumers_by_construct(
    construct_type: str,
    construct_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get all consumers that depend on a specific construct."""
    query = (
        select(ConsumerDependency)
        .options(selectinload(ConsumerDependency.consumer))
        .where(
            ConsumerDependency.construct_type == construct_type,
            ConsumerDependency.construct_key == construct_key,
            ConsumerDependency.is_active == True,
        )
    )
    result = await db.execute(query)
    dependencies = result.scalars().all()

    consumers = []
    for dep in dependencies:
        # We need to fetch the consumer separately since we're using async
        consumer_query = select(Consumer).where(Consumer.id == dep.consumer_id)
        consumer_result = await db.execute(consumer_query)
        consumer = consumer_result.scalar_one_or_none()
        if consumer:
            consumers.append({
                "consumer": consumer.to_summary(),
                "dependency": dep.to_dict(),
            })

    return {
        "construct_type": construct_type,
        "construct_key": construct_key,
        "consumers": consumers,
        "total": len(consumers),
    }


@router.post("")
async def register_consumer(
    consumer_data: ConsumerCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Register a new consumer."""
    consumer = Consumer(
        name=consumer_data.name,
        consumer_type=consumer_data.consumer_type,
        repo_url=consumer_data.repo_url,
        webhook_url=consumer_data.webhook_url,
        contact_email=consumer_data.contact_email,
        auto_update=consumer_data.auto_update,
    )
    db.add(consumer)
    await db.flush()

    # Create dependencies
    for dep_data in consumer_data.dependencies:
        dependency = ConsumerDependency(
            consumer_id=consumer.id,
            construct_type=dep_data.construct_type,
            construct_key=dep_data.construct_key,
            usage_location=dep_data.usage_location,
            usage_type=dep_data.usage_type,
        )
        db.add(dependency)

    await db.flush()
    await db.refresh(consumer)

    return consumer.to_dict()


@router.put("/{consumer_id}")
async def update_consumer(
    consumer_id: str,
    consumer_data: ConsumerUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update a consumer."""
    try:
        uuid = UUID(consumer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid consumer ID format")

    query = select(Consumer).where(Consumer.id == uuid)
    result = await db.execute(query)
    consumer = result.scalar_one_or_none()

    if not consumer:
        raise HTTPException(status_code=404, detail=f"Consumer not found")

    # Update fields
    update_data = consumer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(consumer, field, value)

    return consumer.to_dict()


@router.post("/{consumer_id}/dependencies")
async def add_dependency(
    consumer_id: str,
    dependency_data: DependencyCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Add a dependency to a consumer."""
    try:
        uuid = UUID(consumer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid consumer ID format")

    # Check consumer exists
    consumer_query = select(Consumer).where(Consumer.id == uuid)
    consumer_result = await db.execute(consumer_query)
    consumer = consumer_result.scalar_one_or_none()

    if not consumer:
        raise HTTPException(status_code=404, detail=f"Consumer not found")

    dependency = ConsumerDependency(
        consumer_id=uuid,
        construct_type=dependency_data.construct_type,
        construct_key=dependency_data.construct_key,
        usage_location=dependency_data.usage_location,
        usage_type=dependency_data.usage_type,
    )
    db.add(dependency)
    await db.flush()

    return dependency.to_dict()


@router.delete("/{consumer_id}/dependencies/{dependency_id}")
async def remove_dependency(
    consumer_id: str,
    dependency_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Remove a dependency from a consumer."""
    try:
        consumer_uuid = UUID(consumer_id)
        dep_uuid = UUID(dependency_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    query = select(ConsumerDependency).where(
        ConsumerDependency.id == dep_uuid,
        ConsumerDependency.consumer_id == consumer_uuid
    )
    result = await db.execute(query)
    dependency = result.scalar_one_or_none()

    if not dependency:
        raise HTTPException(status_code=404, detail=f"Dependency not found")

    # Soft delete by marking inactive
    dependency.is_active = False
    return {"message": "Dependency removed"}


@router.delete("/{consumer_id}")
async def delete_consumer(
    consumer_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a consumer and all its dependencies."""
    try:
        uuid = UUID(consumer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid consumer ID format")

    query = select(Consumer).where(Consumer.id == uuid)
    result = await db.execute(query)
    consumer = result.scalar_one_or_none()

    if not consumer:
        raise HTTPException(status_code=404, detail=f"Consumer not found")

    await db.delete(consumer)
    return {"message": f"Consumer '{consumer.name}' has been deleted"}
