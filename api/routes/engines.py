"""Engine management API routes."""

from typing import Optional, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field

from models.database import get_db
from models.engine import Engine, EngineVersion
from stages import StageContext, StageComposer

router = APIRouter()

# Lazy-loaded composer singleton
_composer: Optional[StageComposer] = None


def get_composer() -> StageComposer:
    """Get the stage composer singleton."""
    global _composer
    if _composer is None:
        _composer = StageComposer()
    return _composer


# ============================================================================
# Pydantic Schemas
# ============================================================================


class EngineCreate(BaseModel):
    """Schema for creating an engine."""
    engine_key: str = Field(..., min_length=1, max_length=255)
    engine_name: str = Field(..., min_length=1, max_length=500)
    description: str
    category: str = Field(..., min_length=1, max_length=50)
    kind: str = Field(default="primitive", max_length=50)
    reasoning_domain: Optional[str] = None
    researcher_question: Optional[str] = None
    # NEW: Stage context for template composition
    stage_context: Optional[dict] = Field(
        default=None,
        description="Stage context for prompt composition (preferred over raw prompts)",
    )
    # Legacy prompts (for backwards compatibility)
    extraction_prompt: Optional[str] = None
    curation_prompt: Optional[str] = None
    concretization_prompt: Optional[str] = None
    canonical_schema: dict
    extraction_focus: list[str] = Field(default_factory=list)
    primary_output_modes: list[str] = Field(default_factory=list)
    paradigm_keys: list[str] = Field(default_factory=list)


class EngineUpdate(BaseModel):
    """Schema for updating an engine."""
    engine_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    kind: Optional[str] = None
    reasoning_domain: Optional[str] = None
    researcher_question: Optional[str] = None
    # NEW: Stage context for template composition
    stage_context: Optional[dict] = Field(
        default=None,
        description="Stage context for prompt composition (preferred over raw prompts)",
    )
    # Legacy prompts (for backwards compatibility)
    extraction_prompt: Optional[str] = None
    curation_prompt: Optional[str] = None
    concretization_prompt: Optional[str] = None
    canonical_schema: Optional[dict] = None
    extraction_focus: Optional[list[str]] = None
    primary_output_modes: Optional[list[str]] = None
    paradigm_keys: Optional[list[str]] = None
    status: Optional[str] = None
    change_summary: Optional[str] = None


class EngineResponse(BaseModel):
    """Schema for engine response."""
    id: str
    engine_key: str
    engine_name: str
    description: str
    version: int
    category: str
    kind: str
    reasoning_domain: Optional[str]
    researcher_question: Optional[str]
    # NEW: Stage context for template composition
    stage_context: Optional[dict] = None
    # Legacy prompts (for backwards compatibility - may be None if using stage_context)
    extraction_prompt: Optional[str] = None
    curation_prompt: Optional[str] = None
    concretization_prompt: Optional[str] = None
    canonical_schema: dict
    extraction_focus: list[str]
    primary_output_modes: list[str]
    paradigm_keys: list[str]
    status: str
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


class EngineSummaryResponse(BaseModel):
    """Schema for engine summary in listings."""
    engine_key: str
    engine_name: str
    description: str
    version: int
    category: str
    kind: str
    paradigm_keys: list[str]
    status: str
    has_stage_context: bool = False  # NEW: Indicates if engine uses stage_context


# ============================================================================
# Routes
# ============================================================================


@router.get("")
async def list_engines(
    category: Optional[str] = Query(None, description="Filter by category"),
    kind: Optional[str] = Query(None, description="Filter by kind"),
    paradigm: Optional[str] = Query(None, description="Filter by paradigm"),
    status: str = Query("active", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all engines with optional filtering."""
    query = select(Engine)

    # Apply filters
    if category:
        query = query.where(Engine.category == category)
    if kind:
        query = query.where(Engine.kind == kind)
    if status:
        query = query.where(Engine.status == status)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Engine.engine_name.ilike(search_filter)) |
            (Engine.description.ilike(search_filter)) |
            (Engine.engine_key.ilike(search_filter))
        )
    if paradigm:
        # JSONB array contains - using PostgreSQL-specific operator
        query = query.where(Engine.paradigm_keys.contains([paradigm]))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Apply pagination
    query = query.order_by(Engine.engine_key).offset(offset).limit(limit)

    result = await db.execute(query)
    engines = result.scalars().all()

    return {
        "engines": [e.to_summary() for e in engines],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)) -> dict:
    """Get all categories with counts."""
    query = select(Engine.category, func.count(Engine.id)).group_by(Engine.category)
    result = await db.execute(query)
    categories = {row[0]: row[1] for row in result.all()}
    return {"categories": categories}


@router.get("/{engine_key}")
async def get_engine(
    engine_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a specific engine by key."""
    query = select(Engine).where(Engine.engine_key == engine_key)
    result = await db.execute(query)
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_key}' not found")

    return engine.to_dict()


@router.get("/{engine_key}/versions")
async def get_engine_versions(
    engine_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get version history for an engine."""
    # First get the engine
    engine_query = select(Engine).where(Engine.engine_key == engine_key)
    engine_result = await db.execute(engine_query)
    engine = engine_result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_key}' not found")

    # Get all versions
    query = (
        select(EngineVersion)
        .where(EngineVersion.engine_id == engine.id)
        .order_by(EngineVersion.version.desc())
    )
    result = await db.execute(query)
    versions = result.scalars().all()

    return {
        "engine_key": engine_key,
        "current_version": engine.version,
        "versions": [v.to_dict() for v in versions],
    }


@router.get("/{engine_key}/extraction-prompt")
async def get_extraction_prompt(
    engine_key: str,
    audience: str = Query("analyst", description="Target audience (researcher, analyst, executive, activist)"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the extraction prompt for an engine.

    If engine has stage_context, composes prompt at runtime using templates.
    Otherwise, returns legacy extraction_prompt field.
    """
    query = select(Engine).where(Engine.engine_key == engine_key)
    result = await db.execute(query)
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_key}' not found")

    # If engine has stage_context, compose prompt at runtime
    if engine.stage_context:
        try:
            composer = get_composer()
            stage_context = StageContext(**engine.stage_context)
            composed = composer.compose(
                stage="extraction",
                engine_key=engine_key,
                stage_context=stage_context,
                audience=audience,
                canonical_schema=engine.canonical_schema,
            )
            return {
                "engine_key": engine_key,
                "prompt_type": "extraction",
                "prompt": composed.prompt,
                "audience": audience,
                "framework_used": composed.framework_used,
                "composed": True,
            }
        except Exception as e:
            # Fall back to legacy prompt if composition fails
            if engine.extraction_prompt:
                return {
                    "engine_key": engine_key,
                    "prompt_type": "extraction",
                    "prompt": engine.extraction_prompt,
                    "composed": False,
                    "error": str(e),
                }
            raise HTTPException(status_code=500, detail=f"Failed to compose prompt: {e}")

    # Fall back to legacy prompt
    if not engine.extraction_prompt:
        raise HTTPException(status_code=404, detail=f"No extraction prompt for engine '{engine_key}'")

    return {
        "engine_key": engine_key,
        "prompt_type": "extraction",
        "prompt": engine.extraction_prompt,
        "composed": False,
    }


@router.get("/{engine_key}/curation-prompt")
async def get_curation_prompt(
    engine_key: str,
    audience: str = Query("analyst", description="Target audience (researcher, analyst, executive, activist)"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the curation prompt for an engine.

    If engine has stage_context, composes prompt at runtime using templates.
    Otherwise, returns legacy curation_prompt field.
    """
    query = select(Engine).where(Engine.engine_key == engine_key)
    result = await db.execute(query)
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_key}' not found")

    # If engine has stage_context, compose prompt at runtime
    if engine.stage_context:
        try:
            composer = get_composer()
            stage_context = StageContext(**engine.stage_context)
            composed = composer.compose(
                stage="curation",
                engine_key=engine_key,
                stage_context=stage_context,
                audience=audience,
            )
            return {
                "engine_key": engine_key,
                "prompt_type": "curation",
                "prompt": composed.prompt,
                "audience": audience,
                "framework_used": composed.framework_used,
                "composed": True,
            }
        except Exception as e:
            # Fall back to legacy prompt if composition fails
            if engine.curation_prompt:
                return {
                    "engine_key": engine_key,
                    "prompt_type": "curation",
                    "prompt": engine.curation_prompt,
                    "composed": False,
                    "error": str(e),
                }
            raise HTTPException(status_code=500, detail=f"Failed to compose prompt: {e}")

    # Fall back to legacy prompt
    if not engine.curation_prompt:
        raise HTTPException(status_code=404, detail=f"No curation prompt for engine '{engine_key}'")

    return {
        "engine_key": engine_key,
        "prompt_type": "curation",
        "prompt": engine.curation_prompt,
        "composed": False,
    }


@router.get("/{engine_key}/concretization-prompt")
async def get_concretization_prompt(
    engine_key: str,
    audience: str = Query("analyst", description="Target audience (researcher, analyst, executive, activist)"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the concretization prompt for an engine.

    If engine has stage_context, composes prompt at runtime using templates.
    Otherwise, returns legacy concretization_prompt field.
    """
    query = select(Engine).where(Engine.engine_key == engine_key)
    result = await db.execute(query)
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_key}' not found")

    # If engine has stage_context, compose prompt at runtime
    if engine.stage_context:
        try:
            composer = get_composer()
            stage_context = StageContext(**engine.stage_context)

            # Check if concretization is skipped
            if stage_context.skip_concretization:
                return {
                    "engine_key": engine_key,
                    "prompt_type": "concretization",
                    "prompt": "",
                    "skipped": True,
                    "composed": True,
                }

            composed = composer.compose(
                stage="concretization",
                engine_key=engine_key,
                stage_context=stage_context,
                audience=audience,
            )
            return {
                "engine_key": engine_key,
                "prompt_type": "concretization",
                "prompt": composed.prompt,
                "audience": audience,
                "framework_used": composed.framework_used,
                "composed": True,
            }
        except Exception as e:
            # Fall back to legacy prompt if composition fails
            if engine.concretization_prompt:
                return {
                    "engine_key": engine_key,
                    "prompt_type": "concretization",
                    "prompt": engine.concretization_prompt,
                    "composed": False,
                    "error": str(e),
                }
            raise HTTPException(status_code=500, detail=f"Failed to compose prompt: {e}")

    # Fall back to legacy prompt
    return {
        "engine_key": engine_key,
        "prompt_type": "concretization",
        "prompt": engine.concretization_prompt or "",
        "composed": False,
    }


@router.get("/{engine_key}/stage-context")
async def get_stage_context(
    engine_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the stage context for an engine (for debugging/editing)."""
    query = select(Engine).where(Engine.engine_key == engine_key)
    result = await db.execute(query)
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_key}' not found")

    return {
        "engine_key": engine_key,
        "has_stage_context": engine.stage_context is not None,
        "stage_context": engine.stage_context,
    }


@router.get("/{engine_key}/schema")
async def get_engine_schema(
    engine_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the canonical schema for an engine."""
    query = select(Engine).where(Engine.engine_key == engine_key)
    result = await db.execute(query)
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_key}' not found")

    return {
        "engine_key": engine_key,
        "canonical_schema": engine.canonical_schema,
    }


@router.post("")
async def create_engine(
    engine_data: EngineCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new engine."""
    # Check if engine_key already exists
    existing_query = select(Engine).where(Engine.engine_key == engine_data.engine_key)
    existing = await db.execute(existing_query)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Engine with key '{engine_data.engine_key}' already exists"
        )

    engine = Engine(**engine_data.model_dump())
    db.add(engine)
    await db.flush()

    # Create initial version
    version = EngineVersion(
        engine_id=engine.id,
        version=1,
        full_snapshot=engine.to_dict(),
        change_summary="Initial creation",
    )
    db.add(version)

    return engine.to_dict()


@router.put("/{engine_key}")
async def update_engine(
    engine_key: str,
    engine_data: EngineUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update an existing engine."""
    query = select(Engine).where(Engine.engine_key == engine_key)
    result = await db.execute(query)
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_key}' not found")

    # Store old values for version history
    old_snapshot = engine.to_dict()

    # Update fields
    update_data = engine_data.model_dump(exclude_unset=True)
    change_summary = update_data.pop("change_summary", None)

    for field, value in update_data.items():
        if value is not None:
            setattr(engine, field, value)

    # Increment version
    engine.version += 1

    await db.flush()

    # Create version record
    version = EngineVersion(
        engine_id=engine.id,
        version=engine.version,
        full_snapshot=engine.to_dict(),
        change_summary=change_summary or f"Updated fields: {', '.join(update_data.keys())}",
    )
    db.add(version)

    return engine.to_dict()


@router.delete("/{engine_key}")
async def delete_engine(
    engine_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete an engine (soft delete by setting status to archived)."""
    query = select(Engine).where(Engine.engine_key == engine_key)
    result = await db.execute(query)
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_key}' not found")

    engine.status = "archived"
    return {"message": f"Engine '{engine_key}' has been archived"}


@router.post("/{engine_key}/restore/{version}")
async def restore_engine_version(
    engine_key: str,
    version: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Restore an engine to a previous version."""
    # Get the engine
    engine_query = select(Engine).where(Engine.engine_key == engine_key)
    engine_result = await db.execute(engine_query)
    engine = engine_result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_key}' not found")

    # Get the version to restore
    version_query = select(EngineVersion).where(
        EngineVersion.engine_id == engine.id,
        EngineVersion.version == version
    )
    version_result = await db.execute(version_query)
    engine_version = version_result.scalar_one_or_none()

    if not engine_version:
        raise HTTPException(status_code=404, detail=f"Version {version} not found for engine '{engine_key}'")

    # Restore from snapshot
    snapshot = engine_version.full_snapshot
    for field in [
        "engine_name", "description", "category", "kind", "reasoning_domain",
        "researcher_question", "stage_context", "extraction_prompt", "curation_prompt",
        "concretization_prompt", "canonical_schema", "extraction_focus",
        "primary_output_modes", "paradigm_keys"
    ]:
        if field in snapshot:
            setattr(engine, field, snapshot[field])

    # Increment version
    engine.version += 1
    await db.flush()

    # Create new version record
    new_version = EngineVersion(
        engine_id=engine.id,
        version=engine.version,
        full_snapshot=engine.to_dict(),
        change_summary=f"Restored from version {version}",
    )
    db.add(new_version)

    return engine.to_dict()


# ============================================================================
# Engine Profile (About) Endpoints
# ============================================================================


class EngineProfileResponse(BaseModel):
    """Response for engine profile."""
    engine_key: str
    engine_name: str
    has_profile: bool
    profile: Optional[dict] = None


@router.get("/{engine_key}/profile")
async def get_engine_profile(
    engine_key: str,
    db: AsyncSession = Depends(get_db)
) -> EngineProfileResponse:
    """Get engine profile/about section."""
    result = await db.execute(
        select(Engine).where(Engine.engine_key == engine_key)
    )
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine not found: {engine_key}")

    return EngineProfileResponse(
        engine_key=engine.engine_key,
        engine_name=engine.engine_name,
        has_profile=engine.engine_profile is not None,
        profile=engine.engine_profile
    )


@router.put("/{engine_key}/profile")
async def save_engine_profile(
    engine_key: str,
    profile: dict,
    db: AsyncSession = Depends(get_db)
) -> EngineProfileResponse:
    """Save engine profile."""
    result = await db.execute(
        select(Engine).where(Engine.engine_key == engine_key)
    )
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine not found: {engine_key}")

    engine.engine_profile = profile
    await db.commit()

    return EngineProfileResponse(
        engine_key=engine.engine_key,
        engine_name=engine.engine_name,
        has_profile=True,
        profile=engine.engine_profile
    )


@router.delete("/{engine_key}/profile")
async def delete_engine_profile(
    engine_key: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Delete engine profile."""
    result = await db.execute(
        select(Engine).where(Engine.engine_key == engine_key)
    )
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine not found: {engine_key}")

    engine.engine_profile = None
    await db.commit()

    return {"message": "Profile deleted", "engine_key": engine_key}
