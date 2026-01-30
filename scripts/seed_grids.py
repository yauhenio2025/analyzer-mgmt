#!/usr/bin/env python3
"""Seed the ideas-track and process-track grids from decider-v2 constants."""

import asyncio
import os
import sys
import uuid
from datetime import datetime

# Add the api directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

from sqlalchemy import select
from models.database import async_session
from models.grid import Grid, GridVersion


def _dim(name: str, description: str = "", version: int = 1) -> dict:
    return {"name": name, "description": description, "added_version": version}


# =============================================================================
# IDEAS GRID — Substance (What) x Quality (How)
# =============================================================================

IDEAS_CONDITIONS = [
    _dim("Core Claim", "The central thesis or proposition being advanced"),
    _dim("Conceptual Definitions", "What key terms and concepts mean in this context"),
    _dim("Causal Mechanisms", "How things connect — what drives what"),
    _dim("Tensions & Contradictions", "Where ideas pull apart or compete"),
    _dim("Underlying Assumptions", "What's taken as given, often invisibly"),
    _dim("Scope & Boundaries", "What's included, excluded, and why"),
    _dim("Historical Context", "Precedents, evolution, what came before"),
    _dim("Alternative Framings", "Other ways to see the same problem"),
    _dim("Implications & Consequences", "What follows if this holds"),
    _dim("Ethical Dimensions", "Values, moral weight, fairness at stake"),
    _dim("Analogies & Parallels", "What this resembles, useful models"),
    _dim("Objections & Counterarguments", "What pushes back against the claim"),
    _dim("Conceptual Dependencies", "What must be true first for this to hold"),
    _dim("Edge Cases & Exceptions", "Where the framing breaks down"),
    _dim("Integrative Synthesis", "How the parts form a coherent whole"),
]

IDEAS_AXES = [
    _dim("Precision", "Vague to exact in formulation"),
    _dim("Evidence Strength", "Speculative to empirically grounded"),
    _dim("Logical Coherence", "Fragmented to airtight reasoning"),
    _dim("Depth of Analysis", "Surface-level to foundational"),
    _dim("Confidence Level", "Uncertain to well-established"),
    _dim("Interconnectedness", "Isolated point to integrated with other elements"),
    _dim("Originality", "Conventional to genuinely novel"),
    _dim("Completeness", "Partial sketch to exhaustive treatment"),
    _dim("Clarity of Expression", "Muddled to crystalline articulation"),
    _dim("Degree of Contest", "Settled consensus to actively disputed"),
    _dim("Generalizability", "Particular case to broadly applicable"),
    _dim("Temporal Sensitivity", "Timeless insight to time-bound claim"),
    _dim("Emotional Charge", "Neutral/technical to deeply charged"),
    _dim("Complexity", "Simple and clean to intricate and layered"),
    _dim("Action Proximity", "Pure abstraction to ready for implementation"),
]

IDEAS_ABOUT = """The IDEAS grid maps the intellectual landscape of a decision. Each cell is an intersection of **substance** (what are we thinking about?) and **quality** (how well are we thinking about it?).

The rows capture the **building blocks of ideas**: claims, concepts, tensions, assumptions, objections, analogies — the raw material of thought. The columns capture **epistemic qualities**: how precise, how deep, how well-evidenced, how coherent each building block is.

A cell like (Core Claim × Evidence Strength) asks: "How well-supported is our central thesis?" A cell like (Objections × Completeness) asks: "Have we exhaustively considered what argues against us?"

This grid does NOT deal with execution, stakeholders, timelines, or resources — those belong to the PROCESS grid. IDEAS is purely about the quality of thinking."""

# =============================================================================
# PROCESS GRID — Operations (What) x Execution Quality (How)
# =============================================================================

PROCESS_CONDITIONS = [
    _dim("Resource Availability", "What people, money, time exist?"),
    _dim("Timeline Pressure", "What deadlines apply?"),
    _dim("Dependencies", "What blocks what?"),
    _dim("Risk Factors", "What could go wrong in execution?"),
    _dim("Stakeholder Buy-in", "Who needs to agree?"),
    _dim("Technical Feasibility", "Can it actually be done?"),
    _dim("Learning Requirements", "What needs to be figured out?"),
    _dim("Decision Points", "Where must choices be made?"),
    _dim("Quality Constraints", "What standards must be met?"),
    _dim("Communication Needs", "Who needs to know what?"),
    _dim("Budget Constraints", "What financial limits exist?"),
    _dim("Team Capacity", "What can the team handle?"),
    _dim("External Factors", "What outside influences matter?"),
    _dim("Compliance Requirements", "What rules must be followed?"),
    _dim("Success Metrics", "How will we measure progress?"),
]

PROCESS_AXES = [
    _dim("Urgency", "Can wait to immediate"),
    _dim("Complexity", "Simple to complex"),
    _dim("Control Level", "Dependent to owned"),
    _dim("Effort Required", "Trivial to major"),
    _dim("Expertise Needed", "Familiar to novel"),
    _dim("Parallelizability", "Sequential to parallel"),
    _dim("Visibility", "Internal to public"),
    _dim("Recoverability", "One-shot to iterative"),
    _dim("Cost Impact", "Cheap to expensive"),
    _dim("Quality Impact", "Minor to critical"),
    _dim("Schedule Impact", "Flexible to fixed"),
    _dim("Risk Level", "Safe to risky"),
    _dim("Flexibility", "Rigid to adaptable"),
    _dim("Measurability", "Subjective to quantifiable"),
    _dim("Stakeholder Impact", "Few affected to many"),
]

PROCESS_ABOUT = """The PROCESS grid maps the execution landscape of a decision. Each cell is an intersection of **operational substance** (what needs to happen?) and **execution quality** (how well-positioned are we to do it?).

The rows capture **operational concerns**: resources, timelines, dependencies, risks, stakeholders, feasibility — the practical reality of getting things done. The columns capture **execution qualities**: how urgent, how complex, how controllable, how recoverable each concern is.

A cell like (Dependencies × Complexity) asks: "How intricate are the blocking relationships?" A cell like (Stakeholder Buy-in × Urgency) asks: "How quickly do we need alignment?"

This grid does NOT deal with conceptual clarity, evidence, or argument quality — those belong to the IDEAS grid. PROCESS is purely about the quality of execution."""


GRIDS = [
    {
        "grid_key": "ideas-track",
        "grid_name": "IDEAS Track Grid",
        "description": "Substance × Quality dimensions for the IDEAS track (ARTICULATE/INVESTIGATE/RESOLVE)",
        "about": IDEAS_ABOUT,
        "track": "ideas",
        "conditions": IDEAS_CONDITIONS,
        "axes": IDEAS_AXES,
    },
    {
        "grid_key": "process-track",
        "grid_name": "PROCESS Track Grid",
        "description": "Operations × Execution Quality dimensions for the PROCESS track (DO/LEARN/DECIDE)",
        "about": PROCESS_ABOUT,
        "track": "process",
        "conditions": PROCESS_CONDITIONS,
        "axes": PROCESS_AXES,
    },
]


async def seed():
    async with async_session() as session:
        for grid_data in GRIDS:
            # Check if already exists
            result = await session.execute(
                select(Grid).where(Grid.grid_key == grid_data["grid_key"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  Grid '{grid_data['grid_key']}' already exists (v{existing.version}), skipping")
                continue

            grid = Grid(
                id=str(uuid.uuid4()),
                **grid_data,
                version=1,
                status="active",
            )
            session.add(grid)
            await session.flush()

            # Create initial version snapshot
            version = GridVersion(
                id=str(uuid.uuid4()),
                grid_id=grid.id,
                version=1,
                full_snapshot=grid.to_dict(),
                change_summary="Initial seed from decider-v2 constants",
            )
            session.add(version)
            print(f"  Seeded '{grid_data['grid_key']}': {len(grid_data['conditions'])} conditions x {len(grid_data['axes'])} axes")

        await session.commit()
    print("Done.")


if __name__ == "__main__":
    print("Seeding strategy grids...")
    asyncio.run(seed())
