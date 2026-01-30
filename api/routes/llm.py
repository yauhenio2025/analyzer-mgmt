"""LLM integration API routes for AI-assisted editing."""

import json
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
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


class StageContextImproveRequest(BaseModel):
    """Request for improving stage_context fields."""
    engine_key: str
    stage: str = Field(..., description="extraction, curation, or concretization")
    field: str = Field(..., description="Specific field to improve (e.g., 'extraction_steps', 'core_question')")
    improvement_goal: str = Field(..., description="What to improve about the field")
    current_value: Optional[str] = Field(None, description="Current value if not fetching from DB")


class StageContextImproveResponse(BaseModel):
    """Response with improved stage_context field."""
    engine_key: str
    stage: str
    field: str
    original_value: str
    improved_value: str
    suggestions: list[str]
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


@router.post("/stage-context-improve")
async def improve_stage_context(
    request: StageContextImproveRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get AI-powered improvements for stage_context fields.

    This endpoint helps improve specific fields within stage_context
    (e.g., extraction_steps, core_question, key_relationships).
    """
    # Fetch the engine
    query = select(Engine).where(Engine.engine_key == request.engine_key)
    result = await db.execute(query)
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine '{request.engine_key}' not found")

    # Check if engine has stage_context
    if not engine.stage_context:
        raise HTTPException(
            status_code=400,
            detail=f"Engine '{request.engine_key}' does not have stage_context. Migrate it first."
        )

    # Get the current value
    stage_context = engine.stage_context
    stage_data = stage_context.get(request.stage, {})
    current_value = request.current_value or stage_data.get(request.field)

    if current_value is None:
        raise HTTPException(
            status_code=400,
            detail=f"Field '{request.field}' not found in stage '{request.stage}'"
        )

    # Format current value for display
    if isinstance(current_value, list):
        formatted_current = "\n".join(f"- {item}" for item in current_value)
    elif isinstance(current_value, dict):
        formatted_current = json.dumps(current_value, indent=2)
    else:
        formatted_current = str(current_value)

    # Build the system prompt
    system_prompt = """You are an expert prompt engineer specializing in analytical extraction engines.
You help improve stage_context fields that are used to compose prompts for analysis engines.

The stage_context system uses templates that inject engine-specific context:
- extraction: analysis_type, core_question, extraction_steps, key_relationships, key_fields
- curation: item_type, consolidation_rules, cross_doc_patterns, synthesis_outputs
- concretization: id_examples, naming_guidance, recommended_table_types, recommended_visual_patterns

When improving these fields:
1. Make them more specific and actionable
2. Ensure they guide the LLM clearly
3. Avoid generic language - be concrete to this engine's purpose
4. For lists (extraction_steps, etc.), ensure each item is distinct and valuable

Return your improved version followed by an explanation of changes."""

    # Build the user prompt
    user_prompt = f"""Improve the '{request.field}' field for the "{engine.engine_name}" engine.

**Engine Description**: {engine.description}
**Stage**: {request.stage}
**Field**: {request.field}
**Improvement Goal**: {request.improvement_goal}

**Current Value**:
{formatted_current}

Provide:
1. The improved value (in the same format as the original)
2. A list of specific changes made
3. Brief explanation of why each change helps"""

    response = await call_llm(system_prompt, user_prompt)

    return {
        "engine_key": request.engine_key,
        "stage": request.stage,
        "field": request.field,
        "original_value": formatted_current[:2000] + "..." if len(formatted_current) > 2000 else formatted_current,
        "improved_value": response,
        "suggestions": [
            f"Analyzed and improved based on goal: {request.improvement_goal}"
        ],
        "explanation": "Improvements generated by Claude for stage_context field.",
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


# ============================================================================
# Branch Generation
# ============================================================================


# Generation sequence for branched paradigms (18 fields)
BRANCH_GENERATION_SEQUENCE = [
    # Identity fields first
    ("description", "identity", "A 2-3 sentence description of this paradigm"),
    ("guiding_thinkers", "identity", "Key thinkers whose work informs this paradigm"),
    ("historical_context", "identity", "Historical background and development"),
    # Foundational layer
    ("foundational.assumptions", "foundational", "Core assumptions this paradigm makes"),
    ("foundational.core_tensions", "foundational", "Key tensions or dialectics within the paradigm"),
    ("foundational.scope_conditions", "foundational", "Conditions under which the paradigm applies"),
    # Structural layer
    ("structural.primary_entities", "structural", "Main entities/actors the paradigm analyzes"),
    ("structural.relations", "structural", "Key relationships between entities"),
    ("structural.levels_of_analysis", "structural", "Levels at which analysis occurs"),
    # Dynamic layer
    ("dynamic.change_mechanisms", "dynamic", "How change happens according to this paradigm"),
    ("dynamic.temporal_patterns", "dynamic", "Time-related patterns and processes"),
    ("dynamic.transformation_processes", "dynamic", "How transformations unfold"),
    # Explanatory layer
    ("explanatory.key_concepts", "explanatory", "Core concepts used in analysis"),
    ("explanatory.analytical_methods", "explanatory", "Methods for conducting analysis"),
    ("explanatory.problem_diagnosis", "explanatory", "How problems are identified and diagnosed"),
    ("explanatory.ideal_state", "explanatory", "Vision of ideal or desired outcomes"),
    # Final fields
    ("trait_definitions", "traits", "Traits that characterize this paradigm's analytical lens"),
    ("critique_patterns", "critique", "Patterns for identifying analytical gaps"),
]


BRANCH_GENERATION_SYSTEM_PROMPT = """You are synthesizing a new analytical paradigm by combining insights from an existing paradigm with a new theoretical direction.

PARENT PARADIGM:
{parent_primer}

SYNTHESIS DIRECTION: {synthesis_prompt}

You are generating content for: {field_name} ({layer_name} layer)
Description: {field_description}

PREVIOUSLY GENERATED CONTENT:
{context}

Generate content that:
1. Builds coherently on what was previously generated
2. Synthesizes the parent paradigm with the new direction
3. Is specific and analytical, not generic
4. Maintains internal consistency

Return ONLY a JSON response in the exact format requested. No explanatory text."""


def get_field_value(paradigm: Paradigm, field_path: str):
    """Get a nested field value from paradigm."""
    parts = field_path.split(".")
    value = paradigm
    for part in parts:
        if isinstance(value, dict):
            value = value.get(part)
        else:
            value = getattr(value, part, None)
        if value is None:
            return None
    return value


def set_field_value(paradigm: Paradigm, field_path: str, value) -> None:
    """Set a nested field value on paradigm."""
    parts = field_path.split(".")
    if len(parts) == 1:
        setattr(paradigm, field_path, value)
    else:
        layer_name = parts[0]
        field_name = parts[1]
        layer = getattr(paradigm, layer_name, {}) or {}
        layer[field_name] = value
        setattr(paradigm, layer_name, layer)


def build_generation_context(paradigm: Paradigm, current_field_path: str) -> str:
    """Build context from previously generated fields for coherent generation."""
    context_parts = []

    # Always include identity if available
    if paradigm.description:
        context_parts.append(f"Description: {paradigm.description}")
    if paradigm.guiding_thinkers:
        context_parts.append(f"Guiding Thinkers: {paradigm.guiding_thinkers}")
    if paradigm.historical_context:
        context_parts.append(f"Historical Context: {paradigm.historical_context}")

    # Include completed layers (summarized)
    for layer_name in ["foundational", "structural", "dynamic", "explanatory"]:
        layer = getattr(paradigm, layer_name, {})
        if layer and any(layer.values()):
            layer_summary = []
            for key, items in layer.items():
                if items:
                    layer_summary.append(f"  {key}: {', '.join(items[:3])}")
            if layer_summary:
                context_parts.append(f"{layer_name.title()} Layer:\n" + "\n".join(layer_summary))

    if not context_parts:
        return "No previous content generated yet."

    return "\n\n".join(context_parts)


async def generate_branched_paradigm_content(
    db: AsyncSession,
    paradigm_key: str,
) -> dict:
    """Generate all content for a branched paradigm using sequential LLM calls.

    Each field is generated in sequence, with previous results feeding into
    subsequent calls to maintain coherence.
    """
    from datetime import datetime

    # Get the paradigm and its parent
    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        return {"error": f"Paradigm '{paradigm_key}' not found"}

    if not paradigm.parent_paradigm_key:
        return {"error": "Paradigm has no parent - not a branch"}

    parent_query = select(Paradigm).where(
        Paradigm.paradigm_key == paradigm.parent_paradigm_key
    )
    parent_result = await db.execute(parent_query)
    parent = parent_result.scalar_one_or_none()

    if not parent:
        return {"error": f"Parent paradigm '{paradigm.parent_paradigm_key}' not found"}

    # Get generation metadata
    synthesis_prompt = paradigm.branch_metadata.get("synthesis_prompt", "")
    parent_primer = parent.generate_primer()

    generated_fields = []
    errors = []

    for field_path, layer_name, field_description in BRANCH_GENERATION_SEQUENCE:
        try:
            context = build_generation_context(paradigm, field_path)

            # Determine expected response format based on field type
            if field_path == "description":
                format_instruction = "Return a single string (2-3 sentences)."
                parse_as = "string"
            elif field_path == "guiding_thinkers":
                format_instruction = "Return a single string listing key thinkers (comma-separated)."
                parse_as = "string"
            elif field_path == "historical_context":
                format_instruction = "Return a single string describing historical context."
                parse_as = "string"
            elif field_path == "trait_definitions":
                format_instruction = """Return a JSON array of trait objects:
[{"trait_name": "name", "trait_description": "description", "trait_items": ["item1", "item2"]}]"""
                parse_as = "trait_array"
            elif field_path == "critique_patterns":
                format_instruction = """Return a JSON array of critique pattern objects:
[{"pattern": "name", "diagnostic": "what it identifies", "fix": "template for fixing with {placeholders}"}]"""
                parse_as = "critique_array"
            else:
                format_instruction = "Return a JSON array of 3-5 strings. Example: [\"Item 1\", \"Item 2\", \"Item 3\"]"
                parse_as = "string_array"

            system_prompt = BRANCH_GENERATION_SYSTEM_PROMPT.format(
                parent_primer=parent_primer[:4000],  # Truncate for context
                synthesis_prompt=synthesis_prompt,
                field_name=field_path,
                layer_name=layer_name,
                field_description=field_description,
                context=context[:2000],  # Truncate context
            )

            user_prompt = f"""Generate content for: {field_path}

{format_instruction}

Be specific to this synthesized paradigm. Do not be generic."""

            response = await call_llm(system_prompt, user_prompt)

            # Parse the response
            if parse_as == "string":
                # For string fields, extract from various LLM response formats
                value = response.strip()

                # Handle markdown code blocks
                if "```json" in value:
                    try:
                        json_start = value.index("```json") + 7
                        json_end = value.index("```", json_start)
                        value = value[json_start:json_end].strip()
                    except ValueError:
                        pass
                elif "```" in value:
                    try:
                        start = value.index("```") + 3
                        end = value.index("```", start)
                        value = value[start:end].strip()
                    except ValueError:
                        pass

                # Handle JSON object responses like {"field": "value"}
                if value.startswith("{") and value.endswith("}"):
                    try:
                        parsed = json.loads(value)
                        if isinstance(parsed, dict):
                            # Get the first value from the dict
                            value = list(parsed.values())[0] if parsed else value
                    except json.JSONDecodeError:
                        pass

                # Strip quotes
                value = str(value).strip().strip('"').strip("'")
            elif parse_as == "string_array":
                # Parse JSON array of strings
                try:
                    value = json.loads(response)
                    if not isinstance(value, list):
                        value = [str(value)]
                except json.JSONDecodeError:
                    # Try to extract array from response
                    if "[" in response and "]" in response:
                        start = response.find("[")
                        end = response.rfind("]") + 1
                        value = json.loads(response[start:end])
                    else:
                        value = [response.strip()]
            elif parse_as == "trait_array":
                try:
                    value = json.loads(response)
                    if not isinstance(value, list):
                        value = []
                except json.JSONDecodeError:
                    if "[" in response and "]" in response:
                        start = response.find("[")
                        end = response.rfind("]") + 1
                        value = json.loads(response[start:end])
                    else:
                        value = []
            elif parse_as == "critique_array":
                try:
                    value = json.loads(response)
                    if not isinstance(value, list):
                        value = []
                except json.JSONDecodeError:
                    if "[" in response and "]" in response:
                        start = response.find("[")
                        end = response.rfind("]") + 1
                        value = json.loads(response[start:end])
                    else:
                        value = []

            # Set the value on the paradigm
            set_field_value(paradigm, field_path, value)

            # Mark JSON fields as modified
            if "." in field_path:
                layer_name = field_path.split(".")[0]
                flag_modified(paradigm, layer_name)
            elif field_path in ["trait_definitions", "critique_patterns", "active_traits"]:
                flag_modified(paradigm, field_path)

            generated_fields.append(field_path)

            # Flush to persist progress
            await db.flush()

        except Exception as e:
            errors.append({"field": field_path, "error": str(e)})

    # Update metadata with completion time
    branch_metadata = paradigm.branch_metadata or {}
    branch_metadata["generated_at"] = datetime.utcnow().isoformat()
    branch_metadata["generated_fields"] = generated_fields
    if errors:
        branch_metadata["generation_errors"] = errors
    paradigm.branch_metadata = branch_metadata
    flag_modified(paradigm, "branch_metadata")

    # Update status
    if errors and len(errors) == len(BRANCH_GENERATION_SEQUENCE):
        paradigm.generation_status = "failed"
    else:
        paradigm.generation_status = "complete"
        paradigm.status = "active"

    await db.flush()

    return {
        "paradigm_key": paradigm_key,
        "generated_fields": generated_fields,
        "errors": errors,
        "generation_status": paradigm.generation_status,
    }


@router.post("/generate-branch/{paradigm_key}")
async def generate_branch_content(
    paradigm_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Trigger content generation for a branched paradigm.

    This endpoint starts the sequential LLM generation process for all
    18 fields of a branched paradigm.
    """
    # Verify paradigm exists and is a branch
    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{paradigm_key}' not found")

    if not paradigm.parent_paradigm_key:
        raise HTTPException(status_code=400, detail="Paradigm is not a branch (no parent)")

    if paradigm.generation_status == "complete":
        raise HTTPException(status_code=400, detail="Paradigm generation already complete")

    # Run generation
    result = await generate_branched_paradigm_content(db, paradigm_key)

    return result


@router.get("/branch-progress/{paradigm_key}")
async def get_branch_generation_progress(
    paradigm_key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the current generation progress for a branched paradigm."""
    query = select(Paradigm).where(Paradigm.paradigm_key == paradigm_key)
    result = await db.execute(query)
    paradigm = result.scalar_one_or_none()

    if not paradigm:
        raise HTTPException(status_code=404, detail=f"Paradigm '{paradigm_key}' not found")

    # Count completed fields
    completed = 0
    total = len(BRANCH_GENERATION_SEQUENCE)

    field_status = []
    for field_path, layer_name, _ in BRANCH_GENERATION_SEQUENCE:
        value = get_field_value(paradigm, field_path)
        is_complete = bool(value) if not isinstance(value, list) else len(value) > 0
        if is_complete:
            completed += 1
        field_status.append({
            "field": field_path,
            "layer": layer_name,
            "status": "complete" if is_complete else "pending",
        })

    # Determine current stage
    current_layer = None
    for fs in field_status:
        if fs["status"] == "pending":
            current_layer = fs["layer"]
            break

    return {
        "paradigm_key": paradigm_key,
        "generation_status": paradigm.generation_status,
        "progress": {
            "completed": completed,
            "total": total,
            "percentage": round(completed / total * 100) if total > 0 else 0,
        },
        "current_layer": current_layer,
        "field_status": field_status,
        "branch_metadata": paradigm.branch_metadata,
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


# ============================================================================
# Engine Profile (About) Generation
# ============================================================================


class ProfileGenerateRequest(BaseModel):
    """Request to generate engine profile."""
    engine_key: str = Field(..., description="Key of the engine to generate profile for")
    regenerate_fields: Optional[list[str]] = Field(
        default=None,
        description="Specific fields to regenerate. If None, generates full profile."
    )


class ProfileGenerateResponse(BaseModel):
    """Response from profile generation."""
    engine_key: str
    profile: dict
    fields_generated: list[str]


class ProfileSuggestionRequest(BaseModel):
    """Request for profile field suggestions."""
    engine_key: str
    field: str
    improvement_goal: str = ""


class ProfileSuggestionResponse(BaseModel):
    """Response with profile suggestions."""
    engine_key: str
    field: str
    suggestions: list[str]
    improved_content: Optional[dict] = None


def get_schema_summary(schema: dict) -> str:
    """Extract a summary of key fields from a JSON schema."""
    if not schema:
        return "No schema available"

    summary_parts = []
    for key, value in list(schema.items())[:20]:
        if isinstance(value, list) and len(value) > 0:
            if isinstance(value[0], dict):
                inner_keys = list(value[0].keys())[:5]
                summary_parts.append(f"- {key}: list of objects with {', '.join(inner_keys)}")
            else:
                summary_parts.append(f"- {key}: list")
        elif isinstance(value, dict):
            inner_keys = list(value.keys())[:5]
            summary_parts.append(f"- {key}: object with {', '.join(inner_keys)}")
        else:
            summary_parts.append(f"- {key}")

    return "\n".join(summary_parts)


@router.post("/profile-generate")
async def generate_profile(
    request: ProfileGenerateRequest,
    db: AsyncSession = Depends(get_db)
) -> ProfileGenerateResponse:
    """Generate engine profile using LLM."""
    result = await db.execute(
        select(Engine).where(Engine.engine_key == request.engine_key)
    )
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine not found: {request.engine_key}")

    schema_summary = get_schema_summary(engine.canonical_schema)

    system_prompt = """You are an expert in analytical methodology and philosophy of science.
Generate a rich "About" profile for an analytical engine. Be specific and insightful.
Draw on your knowledge of philosophy, methodology, and analytical frameworks.
Output ONLY valid JSON, no markdown code fences or other text."""

    user_prompt = f"""Generate a profile for this analytical engine:

**Key**: {engine.engine_key}
**Name**: {engine.engine_name}
**Description**: {engine.description}
**Category**: {engine.category}
**Kind**: {engine.kind}
**Reasoning Domain**: {engine.reasoning_domain or 'N/A'}
**Researcher Question**: {engine.researcher_question or 'N/A'}

**Schema Summary** (what the engine outputs):
{schema_summary}

Generate a profile as JSON with this structure:
{{
  "theoretical_foundations": [
    {{"name": "Foundation Name", "description": "Brief explanation", "source_thinker": "Key thinker (optional)"}}
  ],
  "key_thinkers": [
    {{"name": "Thinker Name", "contribution": "What they contributed", "works": ["Key work 1"]}}
  ],
  "methodology": {{
    "approach": "Plain-language description (2-3 sentences)",
    "key_moves": ["Step 1", "Step 2"],
    "conceptual_tools": ["Tool 1", "Tool 2"]
  }},
  "extracts": {{
    "primary_outputs": ["What it mainly extracts"],
    "secondary_outputs": ["Supporting extractions"],
    "relationships": ["Types of relationships identified"]
  }},
  "use_cases": [
    {{"domain": "Domain name", "description": "How the engine helps", "example": "Concrete example"}}
  ],
  "strengths": ["Strength 1", "Strength 2"],
  "limitations": ["Limitation 1", "Limitation 2"],
  "related_engines": [
    {{"engine_key": "related_engine_key", "relationship": "complementary|alternative|prerequisite|extends"}}
  ],
  "preamble": "Brief paragraph for prompt injection context."
}}"""

    try:
        response = await call_llm(system_prompt, user_prompt)

        # Parse JSON from response
        content = response.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]
        content = content.strip()

        profile = json.loads(content)

        fields_generated = request.regenerate_fields or [
            "theoretical_foundations", "key_thinkers", "methodology",
            "extracts", "use_cases", "strengths", "limitations",
            "related_engines", "preamble"
        ]

        return ProfileGenerateResponse(
            engine_key=request.engine_key,
            profile=profile,
            fields_generated=fields_generated
        )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse LLM response: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile generation failed: {e}")


@router.post("/profile-suggestions")
async def get_profile_suggestions(
    request: ProfileSuggestionRequest,
    db: AsyncSession = Depends(get_db)
) -> ProfileSuggestionResponse:
    """Get AI suggestions for improving a profile field."""
    result = await db.execute(
        select(Engine).where(Engine.engine_key == request.engine_key)
    )
    engine = result.scalar_one_or_none()

    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine not found: {request.engine_key}")

    current_value = None
    if engine.engine_profile:
        current_value = engine.engine_profile.get(request.field)

    system_prompt = """You are an expert in analytical methodology.
Suggest improvements for a specific field of an engine profile.
Output as JSON with "suggestions" (list of strings) and optional "improved_content"."""

    user_prompt = f"""Suggest improvements for the "{request.field}" field:

**Engine**: {engine.engine_name}
**Description**: {engine.description}
**Category**: {engine.category}

**Current Value**:
{json.dumps(current_value, indent=2) if current_value else "No current value"}

**Improvement Goal**: {request.improvement_goal or "General improvement"}

Provide 3-5 specific suggestions and an improved version if applicable."""

    try:
        response = await call_llm(system_prompt, user_prompt)

        content = response.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]

        result_data = json.loads(content)

        return ProfileSuggestionResponse(
            engine_key=request.engine_key,
            field=request.field,
            suggestions=result_data.get("suggestions", []),
            improved_content=result_data.get("improved_content")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggestion generation failed: {e}")


@router.get("/status")
async def llm_status() -> dict:
    """Check if LLM service is available."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    return {
        "available": api_key is not None,
        "model": "claude-opus-4-5-20251101" if api_key else None,
        "message": "LLM service ready" if api_key else "Set ANTHROPIC_API_KEY to enable LLM features"
    }
