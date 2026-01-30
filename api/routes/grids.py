"""Grid management API routes."""

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.grid import Grid, GridVersion, WildcardSuggestion

router = APIRouter()

# API key for wildcard submission (consumer projects like decider-v2)
GRIDS_API_KEY = os.getenv("GRIDS_API_KEY", "")


# =============================================================================
# Pydantic Schemas
# =============================================================================

class GridDimensionInput(BaseModel):
    name: str
    description: str = ""
    added_version: int = 1


class GridCreate(BaseModel):
    grid_key: str = Field(..., min_length=1, max_length=255)
    grid_name: str
    description: str = ""
    track: str = Field(..., pattern="^(ideas|process)$")
    conditions: list[dict] = []
    axes: list[dict] = []


class GridUpdate(BaseModel):
    grid_name: Optional[str] = None
    description: Optional[str] = None
    conditions: Optional[list[dict]] = None
    axes: Optional[list[dict]] = None
    status: Optional[str] = None
    change_summary: Optional[str] = None


class WildcardSubmit(BaseModel):
    dimension_type: str = Field(..., pattern="^(condition|axis)$")
    name: str
    description: str = ""
    rationale: str = ""
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    scope: str = Field("project_specific", pattern="^(universal|project_specific)$")
    source_project: Optional[str] = None
    source_session_id: Optional[str] = None
    evidence_questions: Optional[list] = None


# =============================================================================
# Helper
# =============================================================================

async def _get_grid_or_404(grid_key: str, db: AsyncSession) -> Grid:
    result = await db.execute(select(Grid).where(Grid.grid_key == grid_key))
    grid = result.scalar_one_or_none()
    if not grid:
        raise HTTPException(status_code=404, detail=f"Grid '{grid_key}' not found")
    return grid


def _verify_api_key(x_api_key: Optional[str]):
    if not GRIDS_API_KEY:
        return  # No key configured = open access
    if x_api_key != GRIDS_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# =============================================================================
# Grid CRUD
# =============================================================================

@router.get("")
async def list_grids(
    track: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    query = select(Grid)
    if track:
        query = query.where(Grid.track == track)
    if status:
        query = query.where(Grid.status == status)
    query = query.order_by(Grid.grid_key)
    result = await db.execute(query)
    grids = result.scalars().all()
    return {"grids": [g.to_summary() for g in grids], "total": len(grids)}


@router.get("/{grid_key}")
async def get_grid(grid_key: str, db: AsyncSession = Depends(get_db)) -> dict:
    grid = await _get_grid_or_404(grid_key, db)
    return grid.to_dict()


@router.get("/{grid_key}/dimensions")
async def get_grid_dimensions(grid_key: str, db: AsyncSession = Depends(get_db)) -> dict:
    """Consumer endpoint: returns string[] for conditions/axes + dimension_hash."""
    grid = await _get_grid_or_404(grid_key, db)
    return grid.to_dimensions()


@router.get("/{grid_key}/versions")
async def get_grid_versions(grid_key: str, db: AsyncSession = Depends(get_db)) -> dict:
    grid = await _get_grid_or_404(grid_key, db)
    result = await db.execute(
        select(GridVersion)
        .where(GridVersion.grid_id == grid.id)
        .order_by(GridVersion.version.desc())
    )
    versions = result.scalars().all()
    return {
        "grid_key": grid.grid_key,
        "current_version": grid.version,
        "versions": [v.to_dict() for v in versions],
    }


@router.post("")
async def create_grid(data: GridCreate, db: AsyncSession = Depends(get_db)) -> dict:
    # Check uniqueness
    existing = await db.execute(select(Grid).where(Grid.grid_key == data.grid_key))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Grid '{data.grid_key}' already exists")

    grid = Grid(**data.model_dump())
    db.add(grid)
    await db.flush()

    # Create initial version
    version = GridVersion(
        grid_id=grid.id,
        version=1,
        full_snapshot=grid.to_dict(),
        change_summary="Initial creation",
    )
    db.add(version)
    return grid.to_dict()


@router.put("/{grid_key}")
async def update_grid(
    grid_key: str,
    data: GridUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    grid = await _get_grid_or_404(grid_key, db)

    update_data = data.model_dump(exclude_unset=True)
    change_summary = update_data.pop("change_summary", None)

    for field_name, value in update_data.items():
        if value is not None:
            setattr(grid, field_name, value)

    grid.version += 1
    await db.flush()

    # Create version snapshot
    version = GridVersion(
        grid_id=grid.id,
        version=grid.version,
        full_snapshot=grid.to_dict(),
        change_summary=change_summary or f"Updated fields: {', '.join(update_data.keys())}",
    )
    db.add(version)
    return grid.to_dict()


@router.delete("/{grid_key}")
async def delete_grid(grid_key: str, db: AsyncSession = Depends(get_db)) -> dict:
    grid = await _get_grid_or_404(grid_key, db)
    grid.status = "archived"
    return {"message": f"Grid '{grid_key}' archived"}


# =============================================================================
# Wildcard Suggestions
# =============================================================================

@router.post("/{grid_key}/wildcards")
async def submit_wildcard(
    grid_key: str,
    data: WildcardSubmit,
    db: AsyncSession = Depends(get_db),
    x_api_key: Optional[str] = Header(None),
) -> dict:
    """Submit a wildcard suggestion. API-key protected."""
    _verify_api_key(x_api_key)
    grid = await _get_grid_or_404(grid_key, db)

    suggestion = WildcardSuggestion(
        grid_id=grid.id,
        **data.model_dump(),
    )
    db.add(suggestion)
    await db.flush()
    return suggestion.to_dict()


@router.get("/{grid_key}/wildcards")
async def list_wildcards(
    grid_key: str,
    status: Optional[str] = Query(None),
    scope: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    grid = await _get_grid_or_404(grid_key, db)
    query = select(WildcardSuggestion).where(WildcardSuggestion.grid_id == grid.id)
    if status:
        query = query.where(WildcardSuggestion.status == status)
    if scope:
        query = query.where(WildcardSuggestion.scope == scope)
    query = query.order_by(WildcardSuggestion.created_at.desc())
    result = await db.execute(query)
    suggestions = result.scalars().all()
    return {"wildcards": [s.to_dict() for s in suggestions], "total": len(suggestions)}


@router.post("/{grid_key}/wildcards/{wildcard_id}/promote")
async def promote_wildcard(
    grid_key: str,
    wildcard_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Move wildcard to 'review' status."""
    grid = await _get_grid_or_404(grid_key, db)
    result = await db.execute(
        select(WildcardSuggestion).where(
            WildcardSuggestion.id == wildcard_id,
            WildcardSuggestion.grid_id == grid.id,
        )
    )
    suggestion = result.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Wildcard suggestion not found")
    suggestion.status = "review"
    return suggestion.to_dict()


@router.post("/{grid_key}/wildcards/{wildcard_id}/reject")
async def reject_wildcard(
    grid_key: str,
    wildcard_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    grid = await _get_grid_or_404(grid_key, db)
    result = await db.execute(
        select(WildcardSuggestion).where(
            WildcardSuggestion.id == wildcard_id,
            WildcardSuggestion.grid_id == grid.id,
        )
    )
    suggestion = result.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Wildcard suggestion not found")
    suggestion.status = "rejected"
    return suggestion.to_dict()


@router.post("/{grid_key}/wildcards/{wildcard_id}/add-to-grid")
async def add_wildcard_to_grid(
    grid_key: str,
    wildcard_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Add a reviewed wildcard as a new dimension to the grid. Bumps version."""
    grid = await _get_grid_or_404(grid_key, db)
    result = await db.execute(
        select(WildcardSuggestion).where(
            WildcardSuggestion.id == wildcard_id,
            WildcardSuggestion.grid_id == grid.id,
        )
    )
    suggestion = result.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Wildcard suggestion not found")

    # Add dimension to grid
    grid.version += 1
    new_dim = {
        "name": suggestion.name,
        "description": suggestion.description,
        "added_version": grid.version,
    }

    if suggestion.dimension_type == "condition":
        conditions = list(grid.conditions or [])
        conditions.append(new_dim)
        grid.conditions = conditions
    else:
        axes = list(grid.axes or [])
        axes.append(new_dim)
        grid.axes = axes

    suggestion.status = "promoted"
    await db.flush()

    # Create version snapshot
    version = GridVersion(
        grid_id=grid.id,
        version=grid.version,
        full_snapshot=grid.to_dict(),
        change_summary=f"Added {suggestion.dimension_type} '{suggestion.name}' from wildcard suggestion",
    )
    db.add(version)

    return {
        "grid": grid.to_dict(),
        "added_dimension": new_dim,
        "wildcard": suggestion.to_dict(),
    }
