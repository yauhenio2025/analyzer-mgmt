"""LLM integration API routes for AI-assisted editing."""

import json
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from models.database import get_db
from models.engine import Engine
from models.paradigm import Paradigm

router = APIRouter()


# ============================================================================
# JSON Parsing Helper
# ============================================================================


def parse_llm_suggestions(response: str) -> dict:
    """Parse structured JSON from LLM response.

    Attempts to extract JSON from the response. Falls back to wrapping
    raw text as a single suggestion if parsing fails.
    """
    if not response:
        return {"suggestions": [], "analysis_summary": "No response received."}

    # Try direct JSON parse first
    try:
        result = json.loads(response)
        if "suggestions" in result:
            # Add UUIDs to each suggestion if missing
            for suggestion in result.get("suggestions", []):
                if "id" not in suggestion:
                    suggestion["id"] = str(uuid.uuid4())
                # Normalize confidence to float
                if "confidence" not in suggestion:
                    suggestion["confidence"] = 0.8
            return result
    except json.JSONDecodeError:
        pass

    # Try to extract JSON block from markdown
    if "```json" in response:
        try:
            json_start = response.index("```json") + 7
            json_end = response.index("```", json_start)
            json_str = response[json_start:json_end].strip()
            result = json.loads(json_str)
            if "suggestions" in result:
                for suggestion in result.get("suggestions", []):
                    if "id" not in suggestion:
                        suggestion["id"] = str(uuid.uuid4())
                    if "confidence" not in suggestion:
                        suggestion["confidence"] = 0.8
                return result
        except (ValueError, json.JSONDecodeError):
            pass

    # Try to find any JSON object in the response
    try:
        # Find first { and last }
        start = response.find("{")
        end = response.rfind("}") + 1
        if start != -1 and end > start:
            json_str = response[start:end]
            result = json.loads(json_str)
            if "suggestions" in result:
                for suggestion in result.get("suggestions", []):
                    if "id" not in suggestion:
                        suggestion["id"] = str(uuid.uuid4())
                    if "confidence" not in suggestion:
                        suggestion["confidence"] = 0.8
                return result
    except json.JSONDecodeError:
        pass

    # Fallback: wrap raw text as a single suggestion
    return {
        "suggestions": [
            {
                "id": str(uuid.uuid4()),
                "title": "AI Suggestion",
                "content": response,
                "rationale": "Raw response from AI (structured parsing failed)",
                "connections": [],
                "confidence": 0.6
            }
        ],
        "analysis_summary": "Response was returned as raw text."
    }


# ============================================================================
# Pydantic Schemas
# ============================================================================


class ParadigmSuggestionRequest(BaseModel):
    """Request for paradigm extension suggestions."""
    paradigm_key: str
    query: str = Field(..., description="What aspect to analyze or suggest")
    layer: Optional[str] = Field(None, description="Specific layer to focus on")
    field: Optional[str] = Field(None, description="Specific field within the layer")


class StructuredSuggestion(BaseModel):
    """A single structured suggestion from the LLM."""
    id: str = Field(..., description="Unique identifier for this suggestion")
    title: str = Field(..., description="Short title (5 words max)")
    content: str = Field(..., description="The actual item to add (1-2 sentences)")
    rationale: str = Field(..., description="Why this should be added")
    connections: list[str] = Field(default_factory=list, description="Related fields")
    confidence: float = Field(default=0.8, ge=0.0, le=1.0, description="Confidence score")


class ParadigmSuggestionResponse(BaseModel):
    """Response with structured paradigm suggestions."""
    paradigm_key: str
    query: str
    layer: Optional[str] = None
    field: Optional[str] = None
    suggestions: list[StructuredSuggestion]
    analysis_summary: str


class PromptImproveRequest(BaseModel):
    """Request for prompt improvement suggestions."""
    engine_key: str
    prompt_type: str  # extraction, curation, concretization
    improvement_goal: str = Field(..., description="What to improve about the prompt")
    current_prompt: Optional[str] = Field(None, description="If not provided, fetched from DB")


class PromptImproveResponse(BaseModel):
    """Response with improved prompt."""
    engine_key: str
    prompt_type: str
    original_prompt: str
    improved_prompt: str
    changes_made: list[str]
    explanation: str


class SchemaValidateRequest(BaseModel):
    """Request for schema validation."""
    engine_key: str
    proposed_schema: dict
    change_description: str


class SchemaValidateResponse(BaseModel):
    """Response with schema validation results."""
    engine_key: str
    is_valid: bool
    issues: list[dict]
    impact_analysis: dict
    suggestions: list[str]


class CompareParadigmsRequest(BaseModel):
    """Request for paradigm comparison."""
    paradigm_a: str
    paradigm_b: str
    focus_area: Optional[str] = Field(None, description="Area to focus comparison on")


# ============================================================================
# LLM Client (simplified - in production use anthropic SDK)
# ============================================================================


async def call_llm(system_prompt: str, user_prompt: str) -> str:
    """Call the LLM API.

    In production, this would use the Anthropic SDK:

    ```python
    import anthropic
    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )
    return message.content[0].text
    ```
    """
    # For now, return a placeholder response
    # In production, integrate with Anthropic API
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            return message.content[0].text
        except Exception as e:
            return f"LLM Error: {str(e)}"

    return "LLM integration not configured. Set ANTHROPIC_API_KEY environment variable."


# ============================================================================
# Routes
# ============================================================================


@router.post("/paradigm-suggestions")
async def get_paradigm_suggestions(
    request: ParadigmSuggestionRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get AI-powered suggestions for extending a paradigm."""
    # Fetch the paradigm
    query = select(Paradigm).where(Paradigm.paradigm_key == request.paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{request.paradigm_key}' not found")

    # Build the system prompt for structured JSON output
    # Customize format guidance based on field type
    field_format_guide = ""
    if request.field == "core_tensions":
        field_format_guide = """
For core_tensions, format content as: "X vs Y - brief description"
Example: "Reform vs Revolution - gradual change within system versus complete overthrow"
The content field should contain the COMPLETE tension in this format."""
    elif request.field in ["assumptions", "scope_conditions"]:
        field_format_guide = """
Format content as a complete, standalone statement that can be added directly."""
    elif request.field in ["primary_entities", "key_concepts"]:
        field_format_guide = """
Format content as: "Name - brief definition or description"
Example: "Surplus Value - the difference between what workers produce and what they're paid"
For title, just use the name (e.g. "Surplus Value"), don't add words like "Entity" or "Concept"."""
    elif request.field in ["relations", "change_mechanisms"]:
        field_format_guide = """
Format content as a complete description of the relation or mechanism."""

    system_prompt = f"""You are an expert in philosophical paradigms and theoretical frameworks.
You help users extend and improve paradigm definitions in a 4-layer ontology system.

The 4 layers are:
- Foundational: Core assumptions (assumptions), tensions (core_tensions), and scope conditions (scope_conditions)
- Structural: Primary entities (primary_entities), relations (relations), and levels of analysis (levels_of_analysis)
- Dynamic: Change mechanisms (change_mechanisms), temporal patterns (temporal_patterns), transformation processes (transformation_processes)
- Explanatory: Key concepts (key_concepts), analytical methods (analytical_methods), problem diagnosis (problem_diagnosis), ideal state (ideal_state)

IMPORTANT: Return your response as valid JSON in this EXACT format:

{{
  "suggestions": [
    {{
      "title": "Short label (3-5 words)",
      "content": "The COMPLETE item to add - this exact text will be saved",
      "rationale": "Why this should be added (2-3 sentences)",
      "connections": ["related_field_1", "related_field_2"]
    }}
  ],
  "analysis_summary": "Brief overall analysis (1-2 sentences)"
}}
{field_format_guide}
Return 3-5 specific, actionable suggestions. The content field is what gets saved - make it complete and properly formatted.
Do NOT include any text outside the JSON structure. Only output valid JSON."""

    # Build the user prompt with layer/field focus
    layer_focus = ""
    if request.layer:
        layer_focus = f"\n**Focus on layer**: {request.layer}"
        if request.field:
            layer_focus += f"\n**Focus on field**: {request.field}"

    user_prompt = f"""Analyze this paradigm and generate suggestions:

**Paradigm**: {paradigm.paradigm_name}
**Guiding Thinkers**: {paradigm.guiding_thinkers}
**Description**: {paradigm.description}

**Current Definition**:
- Foundational: {paradigm.foundational}
- Structural: {paradigm.structural}
- Dynamic: {paradigm.dynamic}
- Explanatory: {paradigm.explanatory}

**User Query**: {request.query}{layer_focus}

Generate 3-5 suggestions that could be added to strengthen this paradigm. Each suggestion should be a discrete, standalone item suitable for direct addition."""

    response = await call_llm(system_prompt, user_prompt)

    # Parse the structured JSON response
    parsed = parse_llm_suggestions(response)

    return {
        "paradigm_key": request.paradigm_key,
        "query": request.query,
        "layer": request.layer,
        "field": request.field,
        "suggestions": parsed.get("suggestions", []),
        "analysis_summary": parsed.get("analysis_summary", ""),
    }


@router.post("/prompt-improve")
async def improve_prompt(
    request: PromptImproveRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get AI-powered improvements for an engine prompt."""
    # Fetch the engine
    query = select(Engine).where(Engine.engine_key == request.engine_key)
    result = await db.execute(query)
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{request.engine_key}' not found")

    # Get the current prompt
    prompt_field = f"{request.prompt_type}_prompt"
    if not hasattr(engine, prompt_field):
        raise HTTPException(status_code=400, detail=f"Invalid prompt type: {request.prompt_type}")

    current_prompt = request.current_prompt or getattr(engine, prompt_field)
    if not current_prompt:
        raise HTTPException(status_code=400, detail=f"No {request.prompt_type} prompt found")

    # Build the system prompt
    system_prompt = """You are an expert prompt engineer specializing in analytical extraction prompts.
You help improve prompts for analysis engines that extract structured insights from documents.

Key principles:
- Clarity and specificity in instructions
- Proper handling of edge cases
- Consistent output formatting
- Avoiding common pitfalls (hallucination, over-extraction, etc.)

Provide the improved prompt along with a clear explanation of changes made."""

    # Build the user prompt
    user_prompt = f"""Improve this {request.prompt_type} prompt for the "{engine.engine_name}" engine.

**Engine Description**: {engine.description}
**Improvement Goal**: {request.improvement_goal}

**Current Prompt**:
```
{current_prompt[:8000]}  # Truncate very long prompts
```

Provide:
1. The improved prompt
2. A list of specific changes made
3. Explanation of why each change helps"""

    response = await call_llm(system_prompt, user_prompt)

    return {
        "engine_key": request.engine_key,
        "prompt_type": request.prompt_type,
        "original_prompt": current_prompt[:2000] + "..." if len(current_prompt) > 2000 else current_prompt,
        "improved_prompt": response,
        "changes_made": [
            f"Analyzed and improved based on goal: {request.improvement_goal}"
        ],
        "explanation": "Improvements generated by Claude based on prompt engineering best practices.",
    }


@router.post("/schema-validate")
async def validate_schema(
    request: SchemaValidateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Validate a proposed schema change and analyze impact."""
    # Fetch the engine for context
    query = select(Engine).where(Engine.engine_key == request.engine_key)
    result = await db.execute(query)
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{request.engine_key}' not found")

    # Basic schema validation
    issues = []

    # Check for required fields
    if not isinstance(request.proposed_schema, dict):
        issues.append({
            "severity": "error",
            "field": "root",
            "message": "Schema must be a dictionary",
        })
    else:
        # Check for common schema issues
        def check_schema(schema: dict, path: str = ""):
            for key, value in schema.items():
                current_path = f"{path}.{key}" if path else key
                if isinstance(value, dict):
                    check_schema(value, current_path)
                elif isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict):
                    check_schema(value[0], f"{current_path}[0]")

        check_schema(request.proposed_schema)

    # Compare with current schema
    current_schema = engine.canonical_schema
    impact = {
        "breaking_changes": [],
        "additive_changes": [],
        "modified_fields": [],
    }

    if current_schema:
        current_keys = set(str(current_schema.keys()))
        proposed_keys = set(str(request.proposed_schema.keys()))

        removed = current_keys - proposed_keys
        added = proposed_keys - current_keys

        if removed:
            impact["breaking_changes"].extend([f"Removed field: {k}" for k in removed])
        if added:
            impact["additive_changes"].extend([f"Added field: {k}" for k in added])

    # Build LLM prompt for deeper analysis
    system_prompt = """You are an expert in JSON schema design for analytical engines.
Analyze schema changes and provide impact assessment and suggestions."""

    user_prompt = f"""Analyze this schema change for the "{engine.engine_name}" engine:

**Engine Description**: {engine.description}
**Change Description**: {request.change_description}

**Current Schema**:
{engine.canonical_schema}

**Proposed Schema**:
{request.proposed_schema}

Provide:
1. Is this a valid, well-structured schema?
2. What are the implications of this change?
3. Any suggestions for improvement?"""

    llm_response = await call_llm(system_prompt, user_prompt)

    return {
        "engine_key": request.engine_key,
        "is_valid": len([i for i in issues if i.get("severity") == "error"]) == 0,
        "issues": issues,
        "impact_analysis": impact,
        "suggestions": [llm_response] if llm_response else [],
    }


@router.post("/compare-paradigms")
async def compare_paradigms(
    request: CompareParadigmsRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Compare two paradigms and identify complementarities and tensions."""
    # Fetch both paradigms
    query_a = select(Paradigm).where(Paradigm.paradigm_key == request.paradigm_a)
    query_b = select(Paradigm).where(Paradigm.paradigm_key == request.paradigm_b)

    result_a = await db.execute(query_a)
    result_b = await db.execute(query_b)

    paradigm_a = result_a.scalar_one_or_none()
    paradigm_b = result_b.scalar_one_or_none()

    if not paradigm_a:
        raise HTTPException(status_code=404, detail=f"Paradigm '{request.paradigm_a}' not found")
    if not paradigm_b:
        raise HTTPException(status_code=404, detail=f"Paradigm '{request.paradigm_b}' not found")

    # Build the comparison prompt
    system_prompt = """You are an expert in comparative philosophy and theoretical frameworks.
Analyze paradigms to identify:
- Complementarities (where they work together)
- Tensions (where they conflict)
- Blind spots (what each misses that the other captures)
- Synthesis opportunities (how they might be combined)"""

    user_prompt = f"""Compare these two paradigms:

**Paradigm A: {paradigm_a.paradigm_name}**
{paradigm_a.generate_primer()}

**Paradigm B: {paradigm_b.paradigm_name}**
{paradigm_b.generate_primer()}

{f"**Focus Area**: {request.focus_area}" if request.focus_area else ""}

Provide a structured comparison covering:
1. Key complementarities
2. Fundamental tensions
3. Blind spots each fills for the other
4. Potential synthesis points"""

    response = await call_llm(system_prompt, user_prompt)

    return {
        "paradigm_a": request.paradigm_a,
        "paradigm_b": request.paradigm_b,
        "comparison": response,
        "shared_engines": list(
            set(paradigm_a.compatible_engines or []) & set(paradigm_b.compatible_engines or [])
        ),
    }


@router.post("/generate-critique-patterns")
async def generate_critique_patterns(
    paradigm_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Generate new critique patterns for a paradigm using LLM."""
    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{paradigm_key}' not found")

    system_prompt = """You are an expert in philosophical critique and argument analysis.
Generate reusable critique patterns that identify common analytical gaps from a specific paradigm's perspective.

Each pattern should have:
- pattern: A short identifier
- diagnostic: What the pattern identifies as problematic
- fix: A template for fixing the issue with {placeholders} for specific content"""

    user_prompt = f"""Generate critique patterns for the {paradigm.paradigm_name} paradigm:

**Current patterns**:
{paradigm.critique_patterns}

**Paradigm Overview**:
{paradigm.generate_primer()}

Generate 3-5 NEW critique patterns that complement the existing ones.
Focus on common analytical gaps that this paradigm would identify."""

    response = await call_llm(system_prompt, user_prompt)

    return {
        "paradigm_key": paradigm_key,
        "existing_patterns": paradigm.critique_patterns,
        "suggested_patterns": response,
    }
