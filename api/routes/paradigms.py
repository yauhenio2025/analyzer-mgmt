"""Paradigm management API routes."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field

from models.database import get_db
from models.paradigm import Paradigm

router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================


class FoundationalLayer(BaseModel):
    """Foundational layer of paradigm ontology."""
    assumptions: list[str] = Field(default_factory=list)
    core_tensions: list[str] = Field(default_factory=list)
    scope_conditions: list[str] = Field(default_factory=list)


class StructuralLayer(BaseModel):
    """Structural layer of paradigm ontology."""
    primary_entities: list[str] = Field(default_factory=list)
    relations: list[str] = Field(default_factory=list)
    levels_of_analysis: list[str] = Field(default_factory=list)


class DynamicLayer(BaseModel):
    """Dynamic layer of paradigm ontology."""
    change_mechanisms: list[str] = Field(default_factory=list)
    temporal_patterns: list[str] = Field(default_factory=list)
    transformation_processes: list[str] = Field(default_factory=list)


class ExplanatoryLayer(BaseModel):
    """Explanatory layer of paradigm ontology."""
    key_concepts: list[str] = Field(default_factory=list)
    analytical_methods: list[str] = Field(default_factory=list)
    problem_diagnosis: list[str] = Field(default_factory=list)
    ideal_state: list[str] = Field(default_factory=list)


class TraitDefinition(BaseModel):
    """Trait definition schema."""
    trait_name: str
    trait_description: str
    trait_items: list[str] = Field(default_factory=list)


class CritiquePattern(BaseModel):
    """Critique pattern schema."""
    pattern: str
    diagnostic: str
    fix: str


class ParadigmCreate(BaseModel):
    """Schema for creating a paradigm."""
    paradigm_key: str = Field(..., min_length=1, max_length=255)
    paradigm_name: str = Field(..., min_length=1, max_length=500)
    description: str
    guiding_thinkers: str
    version: str = Field(default="1.0.0")
    foundational: FoundationalLayer
    structural: StructuralLayer
    dynamic: DynamicLayer
    explanatory: ExplanatoryLayer
    active_traits: list[str] = Field(default_factory=list)
    trait_definitions: list[TraitDefinition] = Field(default_factory=list)
    critique_patterns: list[CritiquePattern] = Field(default_factory=list)
    historical_context: Optional[str] = None
    related_paradigms: list[str] = Field(default_factory=list)
    primary_engines: list[str] = Field(default_factory=list)
    compatible_engines: list[str] = Field(default_factory=list)


class ParadigmUpdate(BaseModel):
    """Schema for updating a paradigm."""
    paradigm_name: Optional[str] = None
    description: Optional[str] = None
    guiding_thinkers: Optional[str] = None
    version: Optional[str] = None
    foundational: Optional[FoundationalLayer] = None
    structural: Optional[StructuralLayer] = None
    dynamic: Optional[DynamicLayer] = None
    explanatory: Optional[ExplanatoryLayer] = None
    active_traits: Optional[list[str]] = None
    trait_definitions: Optional[list[TraitDefinition]] = None
    critique_patterns: Optional[list[CritiquePattern]] = None
    historical_context: Optional[str] = None
    related_paradigms: Optional[list[str]] = None
    primary_engines: Optional[list[str]] = None
    compatible_engines: Optional[list[str]] = None
    status: Optional[str] = None


class LayerUpdate(BaseModel):
    """Schema for updating a single layer."""
    layer_data: dict


# ============================================================================
# Routes
# ============================================================================


@router.get("")
async def list_paradigms(
    status: str = Query("active", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all paradigms."""
    query = select(Paradigm)

    if status:
        query = query.where(Paradigm.status == status)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Paradigm.paradigm_name.ilike(search_filter)) |
            (Paradigm.description.ilike(search_filter))
        )

    result = await db.execute(query.order_by(Paradigm.paradigm_name))
    paradigms = result.scalars().all()

    return {
        "paradigms": [p.to_summary() for p in paradigms],
        "total": len(paradigms),
    }


@router.get("/{paradigm_key}")
async def get_paradigm(
    paradigm_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a specific paradigm by key."""
    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{paradigm_key}' not found")

    return paradigm.to_dict()


@router.get("/{paradigm_key}/primer")
async def get_paradigm_primer(
    paradigm_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get LLM-ready primer text for a paradigm."""
    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{paradigm_key}' not found")

    return {
        "paradigm_key": paradigm_key,
        "primer_text": paradigm.generate_primer(),
    }


@router.get("/{paradigm_key}/engines")
async def get_paradigm_engines(
    paradigm_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get engines associated with a paradigm."""
    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{paradigm_key}' not found")

    return {
        "paradigm_key": paradigm_key,
        "primary_engines": paradigm.primary_engines,
        "compatible_engines": paradigm.compatible_engines,
    }


@router.get("/{paradigm_key}/critique-patterns")
async def get_critique_patterns(
    paradigm_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get critique patterns for a paradigm."""
    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{paradigm_key}' not found")

    return {
        "paradigm_key": paradigm_key,
        "critique_patterns": paradigm.critique_patterns,
    }


@router.get("/{paradigm_key}/layer/{layer_name}")
async def get_paradigm_layer(
    paradigm_key: str,
    layer_name: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a specific ontology layer from a paradigm."""
    if layer_name not in ["foundational", "structural", "dynamic", "explanatory"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid layer name. Must be one of: foundational, structural, dynamic, explanatory"
        )

    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{paradigm_key}' not found")

    return {
        "paradigm_key": paradigm_key,
        "layer_name": layer_name,
        "layer_data": paradigm.get_layer(layer_name),
    }


@router.post("")
async def create_paradigm(
    paradigm_data: ParadigmCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new paradigm."""
    # Check if paradigm_key already exists
    existing_query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_data.paradigm_key)
    existing = await db.execute(existing_query)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Paradigm with key '{paradigm_data.paradigm_key}' already exists"
        )

    # Convert nested models to dicts
    data = paradigm_data.model_dump()
    data["foundational"] = paradigm_data.foundational.model_dump()
    data["structural"] = paradigm_data.structural.model_dump()
    data["dynamic"] = paradigm_data.dynamic.model_dump()
    data["explanatory"] = paradigm_data.explanatory.model_dump()
    data["trait_definitions"] = [t.model_dump() for t in paradigm_data.trait_definitions]
    data["critique_patterns"] = [c.model_dump() for c in paradigm_data.critique_patterns]

    paradigm = Paradigm(**data)
    db.add(paradigm)
    await db.flush()

    return paradigm.to_dict()


@router.put("/{paradigm_key}")
async def update_paradigm(
    paradigm_key: str,
    paradigm_data: ParadigmUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update an existing paradigm."""
    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{paradigm_key}' not found")

    # Update fields
    update_data = paradigm_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            # Handle nested models
            if hasattr(value, 'model_dump'):
                value = value.model_dump()
            elif isinstance(value, list) and value and hasattr(value[0], 'model_dump'):
                value = [v.model_dump() for v in value]
            setattr(paradigm, field, value)

    return paradigm.to_dict()


@router.put("/{paradigm_key}/layer/{layer_name}")
async def update_paradigm_layer(
    paradigm_key: str,
    layer_name: str,
    layer_data: LayerUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update a specific ontology layer of a paradigm."""
    if layer_name not in ["foundational", "structural", "dynamic", "explanatory"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid layer name. Must be one of: foundational, structural, dynamic, explanatory"
        )

    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{paradigm_key}' not found")

    setattr(paradigm, layer_name, layer_data.layer_data)

    return {
        "paradigm_key": paradigm_key,
        "layer_name": layer_name,
        "layer_data": paradigm.get_layer(layer_name),
    }


@router.delete("/{paradigm_key}")
async def delete_paradigm(
    paradigm_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a paradigm (soft delete)."""
    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{paradigm_key}' not found")

    paradigm.status = "archived"
    return {"message": f"Paradigm '{paradigm_key}' has been archived"}
