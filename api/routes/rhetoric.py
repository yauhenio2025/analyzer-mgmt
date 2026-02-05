"""Rhetoric analyzer management API routes."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field

from models.database import get_db
from models.rhetoric import Rhetoric, RhetoricVersion

router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================


class RhetoricCreate(BaseModel):
    """Schema for creating a rhetoric analyzer."""
    rhetoric_key: str = Field(..., min_length=1, max_length=255)
    name: str = Field(..., min_length=1, max_length=500)
    description: str
    category: str = Field(..., description="rhetoric or vulnerability")
    prompt_template: str
    output_schema: Optional[dict] = None
    requires_subject: bool = False
    requires_critique: bool = False
    requires_response: bool = False
    requires_counter_response: bool = False
    model: str = "claude-opus-4-5-20251101"
    thinking_budget: int = 32000
    max_tokens: int = 64000


class RhetoricUpdate(BaseModel):
    """Schema for updating a rhetoric analyzer."""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    prompt_template: Optional[str] = None
    output_schema: Optional[dict] = None
    requires_subject: Optional[bool] = None
    requires_critique: Optional[bool] = None
    requires_response: Optional[bool] = None
    requires_counter_response: Optional[bool] = None
    model: Optional[str] = None
    thinking_budget: Optional[int] = None
    max_tokens: Optional[int] = None
    status: Optional[str] = None
    change_summary: Optional[str] = None


class RhetoricResponse(BaseModel):
    """Schema for rhetoric analyzer response."""
    id: str
    rhetoric_key: str
    name: str
    description: str
    version: int
    category: str
    prompt_template: str
    output_schema: Optional[dict]
    requires_subject: bool
    requires_critique: bool
    requires_response: bool
    requires_counter_response: bool
    model: str
    thinking_budget: int
    max_tokens: int
    status: str
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


class RhetoricSummaryResponse(BaseModel):
    """Schema for rhetoric analyzer summary in listings."""
    rhetoric_key: str
    name: str
    description: str
    version: int
    category: str
    status: str
    document_requirements: list[str]
    model: str
    thinking_budget: int


# ============================================================================
# Routes
# ============================================================================


@router.get("")
async def list_rhetoric(
    category: Optional[str] = Query(None, description="Filter by category (rhetoric/vulnerability)"),
    status: str = Query("active", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all rhetoric analyzers with optional filtering."""
    query = select(Rhetoric)

    # Apply filters
    if category:
        query = query.where(Rhetoric.category == category)
    if status:
        query = query.where(Rhetoric.status == status)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Rhetoric.name.ilike(search_filter)) |
            (Rhetoric.description.ilike(search_filter)) |
            (Rhetoric.rhetoric_key.ilike(search_filter))
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Apply pagination
    query = query.order_by(Rhetoric.rhetoric_key).offset(offset).limit(limit)

    result = await db.execute(query)
    rhetoric_items = result.scalars().all()

    return {
        "rhetoric": [r.to_summary() for r in rhetoric_items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)) -> dict:
    """Get all categories with counts."""
    query = select(Rhetoric.category, func.count(Rhetoric.id)).group_by(Rhetoric.category)
    result = await db.execute(query)
    categories = {row[0]: row[1] for row in result.all()}
    return {"categories": categories}


@router.post("/seed")
async def seed_rhetoric(db: AsyncSession = Depends(get_db)) -> dict:
    """Seed the rhetoric analyzers with initial data."""
    # Check if already seeded
    count = await db.scalar(select(func.count()).select_from(Rhetoric))
    if count > 0:
        return {"message": f"Already seeded with {count} analyzers", "seeded": 0}

    # Analyzer definitions
    analyzers = [
        # Round 1 - Rhetoric (9)
        {"rhetoric_key": "deflection", "name": "Deflection Analysis", "description": "Identifies instances where the subject author claims the critique author misunderstands their argument, but the critique actually addresses those very points textually.", "category": "rhetoric", "requires_subject": True, "requires_critique": True, "requires_response": True, "requires_counter_response": False},
        {"rhetoric_key": "contradiction", "name": "Self-Contradictions Analysis", "description": "Identifies instances where the subject author's response claims things that go beyond, contradict, or retroactively reframe what they actually argued in their original essays.", "category": "rhetoric", "requires_subject": True, "requires_critique": True, "requires_response": True, "requires_counter_response": False},
        {"rhetoric_key": "silence", "name": "Silence Analysis", "description": "Identifies the critique author's specific questions, challenges, or provocations that the subject author simply doesn't address at all.", "category": "rhetoric", "requires_subject": True, "requires_critique": True, "requires_response": True, "requires_counter_response": False},
        {"rhetoric_key": "leap", "name": "Logical Leaps Analysis", "description": "Identifies instances where the subject author attributes arguments or presuppositions to the critique author that don't follow from what the critique author actually wrote.", "category": "rhetoric", "requires_subject": True, "requires_critique": True, "requires_response": True, "requires_counter_response": False},
        {"rhetoric_key": "concession", "name": "Concessions Analysis", "description": "Identifies places where the subject author implicitly agrees with the critique author through changed framing, added qualifications, or behavioral shifts.", "category": "rhetoric", "requires_subject": True, "requires_critique": True, "requires_response": True, "requires_counter_response": False},
        {"rhetoric_key": "retreat", "name": "Retreats Analysis", "description": "Identifies 'clarifications' that are actually substantive position changes - where the subject author weakens, narrows, or qualifies claims.", "category": "rhetoric", "requires_subject": True, "requires_critique": False, "requires_response": True, "requires_counter_response": False},
        {"rhetoric_key": "cherrypick", "name": "Cherry Picks Analysis", "description": "Identifies where the subject author quotes the critique author out of context, truncates quotes to change meaning, or selectively ignores parts.", "category": "rhetoric", "requires_subject": False, "requires_critique": True, "requires_response": True, "requires_counter_response": False},
        {"rhetoric_key": "tuquoque", "name": "Tu Quoque Analysis", "description": "Identifies where the subject author deflects criticism by claiming the critique author has the same problem or faces the same challenge.", "category": "rhetoric", "requires_subject": False, "requires_critique": True, "requires_response": True, "requires_counter_response": False},
        {"rhetoric_key": "namedrop", "name": "Name-Drop Analysis", "description": "Identifies where the subject author invokes theorists without showing how their work actually supports specific claims.", "category": "rhetoric", "requires_subject": True, "requires_critique": True, "requires_response": True, "requires_counter_response": False},
        # Round 2 - Vulnerability (9)
        {"rhetoric_key": "strawman_risk", "name": "Strawman Risk Analysis", "description": "Identifies instances where the critique author might be accused of misrepresenting the subject author's position.", "category": "vulnerability", "requires_subject": True, "requires_critique": False, "requires_response": True, "requires_counter_response": True},
        {"rhetoric_key": "inconsistency", "name": "Inconsistency Analysis", "description": "Identifies instances where the critique author contradicts himself within or between documents.", "category": "vulnerability", "requires_subject": False, "requires_critique": True, "requires_response": False, "requires_counter_response": True},
        {"rhetoric_key": "logic_gap", "name": "Logic Gap Analysis", "description": "Identifies instances where the critique author's conclusions don't follow from premises - logical leaps and non sequiturs.", "category": "vulnerability", "requires_subject": False, "requires_critique": False, "requires_response": False, "requires_counter_response": True},
        {"rhetoric_key": "unanswered", "name": "Unanswered Points Analysis", "description": "Identifies valid points from the subject author's response that the critique author fails to address.", "category": "vulnerability", "requires_subject": False, "requires_critique": False, "requires_response": True, "requires_counter_response": True},
        {"rhetoric_key": "overconcession", "name": "Over-Concession Analysis", "description": "Identifies instances where the critique author concedes too much, undermining their own argument.", "category": "vulnerability", "requires_subject": False, "requires_critique": True, "requires_response": False, "requires_counter_response": True},
        {"rhetoric_key": "overreach", "name": "Overreach Analysis", "description": "Identifies instances where the critique author extends arguments beyond defensible positions.", "category": "vulnerability", "requires_subject": False, "requires_critique": False, "requires_response": False, "requires_counter_response": True},
        {"rhetoric_key": "undercitation", "name": "Under-Citation Analysis", "description": "Identifies instances where the critique author makes claims about the subject without sufficient textual support.", "category": "vulnerability", "requires_subject": True, "requires_critique": False, "requires_response": True, "requires_counter_response": True},
        {"rhetoric_key": "weak_authority", "name": "Weak Authority Analysis", "description": "Identifies instances where the critique author invokes theorists whose positions may not actually support the claims.", "category": "vulnerability", "requires_subject": False, "requires_critique": False, "requires_response": False, "requires_counter_response": True},
        {"rhetoric_key": "exposed_flank", "name": "Exposed Flank Analysis", "description": "Identifies instances where the critique author's critiques could be turned back on themselves.", "category": "vulnerability", "requires_subject": False, "requires_critique": True, "requires_response": True, "requires_counter_response": True},
    ]

    seeded = 0
    for data in analyzers:
        rhetoric = Rhetoric(
            rhetoric_key=data["rhetoric_key"],
            name=data["name"],
            description=data["description"],
            category=data["category"],
            prompt_template=f"Analyze {data['name'].lower()} patterns...",
            output_schema={},
            requires_subject=data["requires_subject"],
            requires_critique=data["requires_critique"],
            requires_response=data["requires_response"],
            requires_counter_response=data["requires_counter_response"],
        )
        db.add(rhetoric)
        seeded += 1

    await db.commit()
    return {"message": f"Successfully seeded {seeded} rhetoric analyzers", "seeded": seeded}


@router.get("/{rhetoric_key}")
async def get_rhetoric(
    rhetoric_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a specific rhetoric analyzer by key."""
    query = select(Rhetoric).where(Rhetoric.rhetoric_key == rhetoric_key)
    result = await db.execute(query)
    rhetoric = result.scalar_one_or_none()

    if not rhetoric:
        raise HTTPException(status_code=404, detail=f"Rhetoric analyzer '{rhetoric_key}' not found")

    return rhetoric.to_dict()


@router.get("/{rhetoric_key}/versions")
async def get_rhetoric_versions(
    rhetoric_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get version history for a rhetoric analyzer."""
    rhetoric_query = select(Rhetoric).where(Rhetoric.rhetoric_key == rhetoric_key)
    rhetoric_result = await db.execute(rhetoric_query)
    rhetoric = rhetoric_result.scalar_one_or_none()

    if not rhetoric:
        raise HTTPException(status_code=404, detail=f"Rhetoric analyzer '{rhetoric_key}' not found")

    query = (
        select(RhetoricVersion)
        .where(RhetoricVersion.rhetoric_id == rhetoric.id)
        .order_by(RhetoricVersion.version.desc())
    )
    result = await db.execute(query)
    versions = result.scalars().all()

    return {
        "rhetoric_key": rhetoric_key,
        "current_version": rhetoric.version,
        "versions": [v.to_dict() for v in versions],
    }


@router.get("/{rhetoric_key}/prompt")
async def get_rendered_prompt(
    rhetoric_key: str,
    subject_author: str = Query("Subject Author", description="Name of the subject author"),
    critique_author: str = Query("Critique Author", description="Name of the critique author"),
    response_author: Optional[str] = Query(None, description="Name of response author (defaults to subject)"),
    user_author: Optional[str] = Query(None, description="Name of user author (defaults to critique)"),
    subject_work: str = Query("", description="Title of subject's work"),
    critique_work: str = Query("", description="Title of critique"),
    response_work: str = Query("", description="Title of response"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the prompt template with placeholders replaced by provided context.

    Placeholders: {SUBJECT_AUTHOR}, {CRITIQUE_AUTHOR}, {RESPONSE_AUTHOR},
    {USER_AUTHOR}, {SUBJECT_WORK}, {CRITIQUE_WORK}, {RESPONSE_WORK}
    """
    query = select(Rhetoric).where(Rhetoric.rhetoric_key == rhetoric_key)
    result = await db.execute(query)
    rhetoric = result.scalar_one_or_none()

    if not rhetoric:
        raise HTTPException(status_code=404, detail=f"Rhetoric analyzer '{rhetoric_key}' not found")

    # Build context
    context = {
        "SUBJECT_AUTHOR": subject_author,
        "CRITIQUE_AUTHOR": critique_author,
        "RESPONSE_AUTHOR": response_author or subject_author,
        "USER_AUTHOR": user_author or critique_author,
        "SUBJECT_WORK": subject_work,
        "CRITIQUE_WORK": critique_work,
        "RESPONSE_WORK": response_work,
    }

    # Parameterize prompt
    rendered_prompt = rhetoric.prompt_template
    for placeholder, value in context.items():
        rendered_prompt = rendered_prompt.replace(f"{{{placeholder}}}", value)

    return {
        "rhetoric_key": rhetoric_key,
        "name": rhetoric.name,
        "category": rhetoric.category,
        "rendered_prompt": rendered_prompt,
        "context_used": context,
        "document_requirements": rhetoric.get_document_requirements(),
        "model": rhetoric.model,
        "thinking_budget": rhetoric.thinking_budget,
        "max_tokens": rhetoric.max_tokens,
    }


@router.post("")
async def create_rhetoric(
    rhetoric_data: RhetoricCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new rhetoric analyzer."""
    # Check if key already exists
    existing_query = select(Rhetoric).where(Rhetoric.rhetoric_key == rhetoric_data.rhetoric_key)
    existing = await db.execute(existing_query)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Rhetoric analyzer with key '{rhetoric_data.rhetoric_key}' already exists"
        )

    rhetoric = Rhetoric(**rhetoric_data.model_dump())
    db.add(rhetoric)
    await db.flush()

    # Create initial version
    version = RhetoricVersion(
        rhetoric_id=rhetoric.id,
        version=1,
        full_snapshot=rhetoric.to_dict(),
        change_summary="Initial creation",
    )
    db.add(version)

    return rhetoric.to_dict()


@router.put("/{rhetoric_key}")
async def update_rhetoric(
    rhetoric_key: str,
    rhetoric_data: RhetoricUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update an existing rhetoric analyzer."""
    query = select(Rhetoric).where(Rhetoric.rhetoric_key == rhetoric_key)
    result = await db.execute(query)
    rhetoric = result.scalar_one_or_none()

    if not rhetoric:
        raise HTTPException(status_code=404, detail=f"Rhetoric analyzer '{rhetoric_key}' not found")

    # Update fields
    update_data = rhetoric_data.model_dump(exclude_unset=True)
    change_summary = update_data.pop("change_summary", None)

    for field, value in update_data.items():
        if value is not None:
            setattr(rhetoric, field, value)

    # Increment version
    rhetoric.version += 1

    await db.flush()

    # Create version record
    version = RhetoricVersion(
        rhetoric_id=rhetoric.id,
        version=rhetoric.version,
        full_snapshot=rhetoric.to_dict(),
        change_summary=change_summary or f"Updated fields: {', '.join(update_data.keys())}",
    )
    db.add(version)

    return rhetoric.to_dict()


@router.delete("/{rhetoric_key}")
async def delete_rhetoric(
    rhetoric_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a rhetoric analyzer (soft delete by setting status to archived)."""
    query = select(Rhetoric).where(Rhetoric.rhetoric_key == rhetoric_key)
    result = await db.execute(query)
    rhetoric = result.scalar_one_or_none()

    if not rhetoric:
        raise HTTPException(status_code=404, detail=f"Rhetoric analyzer '{rhetoric_key}' not found")

    rhetoric.status = "archived"
    rhetoric.version += 1

    await db.flush()

    # Create version record
    version = RhetoricVersion(
        rhetoric_id=rhetoric.id,
        version=rhetoric.version,
        full_snapshot=rhetoric.to_dict(),
        change_summary="Archived (soft delete)",
    )
    db.add(version)

    return {"message": f"Rhetoric analyzer '{rhetoric_key}' archived"}


@router.post("/{rhetoric_key}/restore/{version_number}")
async def restore_rhetoric_version(
    rhetoric_key: str,
    version_number: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Restore a rhetoric analyzer to a specific version."""
    # Get current rhetoric
    rhetoric_query = select(Rhetoric).where(Rhetoric.rhetoric_key == rhetoric_key)
    rhetoric_result = await db.execute(rhetoric_query)
    rhetoric = rhetoric_result.scalar_one_or_none()

    if not rhetoric:
        raise HTTPException(status_code=404, detail=f"Rhetoric analyzer '{rhetoric_key}' not found")

    # Get target version
    version_query = select(RhetoricVersion).where(
        RhetoricVersion.rhetoric_id == rhetoric.id,
        RhetoricVersion.version == version_number
    )
    version_result = await db.execute(version_query)
    target_version = version_result.scalar_one_or_none()

    if not target_version:
        raise HTTPException(
            status_code=404,
            detail=f"Version {version_number} not found for rhetoric analyzer '{rhetoric_key}'"
        )

    # Restore from snapshot (exclude non-restorable fields)
    snapshot = target_version.full_snapshot
    restorable_fields = [
        "name", "description", "category", "prompt_template", "output_schema",
        "requires_subject", "requires_critique", "requires_response", "requires_counter_response",
        "model", "thinking_budget", "max_tokens", "status"
    ]

    for field in restorable_fields:
        if field in snapshot:
            setattr(rhetoric, field, snapshot[field])

    # Increment version
    rhetoric.version += 1

    await db.flush()

    # Create version record
    version = RhetoricVersion(
        rhetoric_id=rhetoric.id,
        version=rhetoric.version,
        full_snapshot=rhetoric.to_dict(),
        change_summary=f"Restored from version {version_number}",
    )
    db.add(version)

    return rhetoric.to_dict()
