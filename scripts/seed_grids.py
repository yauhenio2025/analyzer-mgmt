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


IDEAS_CONDITIONS = [
    _dim("Conceptual Clarity", "What does the concept mean?"),
    _dim("Logical Consistency", "Does the reasoning hold together?"),
    _dim("Evidence Quality", "How well-supported are the claims?"),
    _dim("Stakeholder Perspective", "What are the different viewpoints?"),
    _dim("Assumption Validity", "What hidden premises exist?"),
    _dim("Scope Definition", "What's in and out of bounds?"),
    _dim("Trade-off Balance", "What competing values are in tension?"),
    _dim("Historical Context", "What precedents exist?"),
    _dim("Future Implications", "What long-term effects follow?"),
    _dim("Ethical Considerations", "What moral dimensions apply?"),
    _dim("Risk Assessment", "What could go wrong conceptually?"),
    _dim("Alternative Framings", "What other ways to see this?"),
    _dim("Implementation Bridge", "How does this translate to action?"),
    _dim("Communication Clarity", "Can this be explained clearly?"),
    _dim("Decision Criteria", "What makes one option better?"),
]

IDEAS_AXES = [
    _dim("Specificity", "Vague to precise"),
    _dim("Evidence Base", "Speculation to proven"),
    _dim("Consensus Level", "Disputed to agreed"),
    _dim("Urgency", "Can wait to immediate"),
    _dim("Complexity", "Simple to intricate"),
    _dim("Abstraction", "Concrete to abstract"),
    _dim("Impact Scope", "Local to systemic"),
    _dim("Reversibility", "Permanent to changeable"),
    _dim("Certainty", "Unknown to certain"),
    _dim("Dependencies", "Standalone to interconnected"),
    _dim("Novelty", "Familiar to new"),
    _dim("Emotional Weight", "Neutral to charged"),
    _dim("Resource Needs", "Minimal to substantial"),
    _dim("Time Sensitivity", "Flexible to urgent"),
    _dim("Stakeholder Count", "Few to many"),
]

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


GRIDS = [
    {
        "grid_key": "ideas-track",
        "grid_name": "IDEAS Track Grid",
        "description": "Conceptual/theoretical dimensions for the IDEAS track (ARTICULATE/INVESTIGATE/RESOLVE)",
        "track": "ideas",
        "conditions": IDEAS_CONDITIONS,
        "axes": IDEAS_AXES,
    },
    {
        "grid_key": "process-track",
        "grid_name": "PROCESS Track Grid",
        "description": "Execution/practical dimensions for the PROCESS track (DO/LEARN/DECIDE)",
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
