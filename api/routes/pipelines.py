"""Pipeline management API routes."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from models.database import get_db
from models.pipeline import Pipeline, PipelineStage

router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================


class StageCreate(BaseModel):
    """Schema for creating a pipeline stage."""
    stage_order: int
    stage_name: str
    engine_key: Optional[str] = None
    sub_pipeline_id: Optional[str] = None
    blend_mode: Optional[str] = None
    sub_pass_engine_keys: list[str] = Field(default_factory=list)
    pass_context: bool = True
    config: dict = Field(default_factory=dict)


class PipelineCreate(BaseModel):
    """Schema for creating a pipeline."""
    pipeline_key: str = Field(..., min_length=1, max_length=255)
    pipeline_name: str = Field(..., min_length=1, max_length=500)
    description: str
    blend_mode: str = Field(default="sequential")
    category: Optional[str] = None
    stages: list[StageCreate] = Field(default_factory=list)


class PipelineUpdate(BaseModel):
    """Schema for updating a pipeline."""
    pipeline_name: Optional[str] = None
    description: Optional[str] = None
    blend_mode: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None


class StageUpdate(BaseModel):
    """Schema for updating a stage."""
    stage_name: Optional[str] = None
    engine_key: Optional[str] = None
    blend_mode: Optional[str] = None
    sub_pass_engine_keys: Optional[list[str]] = None
    pass_context: Optional[bool] = None
    config: Optional[dict] = None


# ============================================================================
# Routes
# ============================================================================


@router.get("")
async def list_pipelines(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: str = Query("active", description="Filter by status"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all pipelines."""
    query = select(Pipeline).options(selectinload(Pipeline.stages))

    if category:
        query = query.where(Pipeline.category == category)
    if status:
        query = query.where(Pipeline.status == status)

    result = await db.execute(query.order_by(Pipeline.pipeline_name))
    pipelines = result.scalars().all()

    return {
        "pipelines": [p.to_summary() for p in pipelines],
        "total": len(pipelines),
    }


@router.get("/categories")
async def list_pipeline_categories(db: AsyncSession = Depends(get_db)) -> dict:
    """Get all pipeline categories."""
    query = select(Pipeline.category).distinct().where(Pipeline.category.isnot(None))
    result = await db.execute(query)
    categories = [row[0] for row in result.all()]
    return {"categories": categories}


@router.get("/{pipeline_key}")
async def get_pipeline(
    pipeline_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a specific pipeline by key."""
    query = (
        select(Pipeline)
        .options(selectinload(Pipeline.stages))
        .where(Pipeline.pipeline_key == pipeline_key)
    )
    result = await db.execute(query)
    pipeline = result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_key}' not found")

    return pipeline.to_dict()


@router.get("/{pipeline_key}/stages")
async def get_pipeline_stages(
    pipeline_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get all stages for a pipeline."""
    query = (
        select(Pipeline)
        .options(selectinload(Pipeline.stages))
        .where(Pipeline.pipeline_key == pipeline_key)
    )
    result = await db.execute(query)
    pipeline = result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_key}' not found")

    return {
        "pipeline_key": pipeline_key,
        "stages": [s.to_dict() for s in pipeline.stages],
    }


@router.post("")
async def create_pipeline(
    pipeline_data: PipelineCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new pipeline."""
    # Check if pipeline_key already exists
    existing_query = select(Pipeline).where(Pipeline.pipeline_key == pipeline_data.pipeline_key)
    existing = await db.execute(existing_query)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Pipeline with key '{pipeline_data.pipeline_key}' already exists"
        )

    # Create pipeline
    pipeline = Pipeline(
        pipeline_key=pipeline_data.pipeline_key,
        pipeline_name=pipeline_data.pipeline_name,
        description=pipeline_data.description,
        blend_mode=pipeline_data.blend_mode,
        category=pipeline_data.category,
        stage_definitions=[s.model_dump() for s in pipeline_data.stages],
    )
    db.add(pipeline)
    await db.flush()

    # Create stages
    for stage_data in pipeline_data.stages:
        stage = PipelineStage(
            pipeline_id=pipeline.id,
            stage_order=stage_data.stage_order,
            stage_name=stage_data.stage_name,
            engine_key=stage_data.engine_key,
            blend_mode=stage_data.blend_mode,
            sub_pass_engine_keys=stage_data.sub_pass_engine_keys,
            pass_context=stage_data.pass_context,
            config=stage_data.config,
        )
        db.add(stage)

    await db.flush()

    # Reload with stages
    await db.refresh(pipeline)
    query = (
        select(Pipeline)
        .options(selectinload(Pipeline.stages))
        .where(Pipeline.id == pipeline.id)
    )
    result = await db.execute(query)
    pipeline = result.scalar_one()

    return pipeline.to_dict()


@router.put("/{pipeline_key}")
async def update_pipeline(
    pipeline_key: str,
    pipeline_data: PipelineUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update an existing pipeline."""
    query = (
        select(Pipeline)
        .options(selectinload(Pipeline.stages))
        .where(Pipeline.pipeline_key == pipeline_key)
    )
    result = await db.execute(query)
    pipeline = result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_key}' not found")

    # Update fields
    update_data = pipeline_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(pipeline, field, value)

    return pipeline.to_dict()


@router.put("/{pipeline_key}/stages/{stage_order}")
async def update_pipeline_stage(
    pipeline_key: str,
    stage_order: int,
    stage_data: StageUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update a specific stage in a pipeline."""
    # Get pipeline
    pipeline_query = select(Pipeline).where(Pipeline.pipeline_key == pipeline_key)
    pipeline_result = await db.execute(pipeline_query)
    pipeline = pipeline_result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_key}' not found")

    # Get stage
    stage_query = select(PipelineStage).where(
        PipelineStage.pipeline_id == pipeline.id,
        PipelineStage.stage_order == stage_order
    )
    stage_result = await db.execute(stage_query)
    stage = stage_result.scalar_one_or_none()

    if not stage:
        raise HTTPException(status_code=404, detail=f"Stage {stage_order} not found in pipeline '{pipeline_key}'")

    # Update fields
    update_data = stage_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(stage, field, value)

    return stage.to_dict()


@router.post("/{pipeline_key}/stages")
async def add_pipeline_stage(
    pipeline_key: str,
    stage_data: StageCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Add a new stage to a pipeline."""
    query = select(Pipeline).where(Pipeline.pipeline_key == pipeline_key)
    result = await db.execute(query)
    pipeline = result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_key}' not found")

    stage = PipelineStage(
        pipeline_id=pipeline.id,
        stage_order=stage_data.stage_order,
        stage_name=stage_data.stage_name,
        engine_key=stage_data.engine_key,
        blend_mode=stage_data.blend_mode,
        sub_pass_engine_keys=stage_data.sub_pass_engine_keys,
        pass_context=stage_data.pass_context,
        config=stage_data.config,
    )
    db.add(stage)
    await db.flush()

    return stage.to_dict()


@router.delete("/{pipeline_key}/stages/{stage_order}")
async def delete_pipeline_stage(
    pipeline_key: str,
    stage_order: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a stage from a pipeline."""
    # Get pipeline
    pipeline_query = select(Pipeline).where(Pipeline.pipeline_key == pipeline_key)
    pipeline_result = await db.execute(pipeline_query)
    pipeline = pipeline_result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_key}' not found")

    # Get stage
    stage_query = select(PipelineStage).where(
        PipelineStage.pipeline_id == pipeline.id,
        PipelineStage.stage_order == stage_order
    )
    stage_result = await db.execute(stage_query)
    stage = stage_result.scalar_one_or_none()

    if not stage:
        raise HTTPException(status_code=404, detail=f"Stage {stage_order} not found in pipeline '{pipeline_key}'")

    await db.delete(stage)
    return {"message": f"Stage {stage_order} deleted from pipeline '{pipeline_key}'"}


@router.post("/{pipeline_key}/reorder")
async def reorder_pipeline_stages(
    pipeline_key: str,
    new_order: list[int],
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Reorder stages in a pipeline."""
    query = (
        select(Pipeline)
        .options(selectinload(Pipeline.stages))
        .where(Pipeline.pipeline_key == pipeline_key)
    )
    result = await db.execute(query)
    pipeline = result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_key}' not found")

    # Validate new_order
    current_orders = {s.stage_order for s in pipeline.stages}
    if set(new_order) != current_orders:
        raise HTTPException(status_code=400, detail="Invalid stage order - must include all current stages")

    # Update stage orders
    order_map = {old: new for new, old in enumerate(new_order)}
    for stage in pipeline.stages:
        stage.stage_order = order_map[stage.stage_order]

    return pipeline.to_dict()


@router.delete("/{pipeline_key}")
async def delete_pipeline(
    pipeline_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a pipeline (soft delete)."""
    query = select(Pipeline).where(Pipeline.pipeline_key == pipeline_key)
    result = await db.execute(query)
    pipeline = result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_key}' not found")

    pipeline.status = "archived"
    return {"message": f"Pipeline '{pipeline_key}' has been archived"}
