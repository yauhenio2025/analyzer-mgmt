#!/usr/bin/env python3
"""Migrate JSON definitions from analyzer-v2 to PostgreSQL database.

This script reads all engine, paradigm, and chain definitions from the
analyzer-v2 JSON files and inserts them into the PostgreSQL database
with version 1.

Usage:
    python migrate_json_to_postgres.py [--analyzer-path PATH] [--db-url URL]

Environment variables:
    ANALYZER_V2_PATH: Path to analyzer-v2 project (default: ../analyzer-v2)
    DATABASE_URL: PostgreSQL connection URL
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from datetime import datetime

# Add the api directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from models.database import Base
from models.engine import Engine, EngineVersion
from models.paradigm import Paradigm
from models.pipeline import Pipeline, PipelineStage


def get_database_url() -> str:
    """Get database URL from environment."""
    url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./analyzer_mgmt.db")
    # Handle PostgreSQL URL format
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def load_json_files(directory: Path) -> list[dict]:
    """Load all JSON files from a directory."""
    files = []
    for json_file in directory.glob("*.json"):
        try:
            with open(json_file, "r") as f:
                data = json.load(f)
                data["_source_file"] = str(json_file)
                files.append(data)
        except (json.JSONDecodeError, IOError) as e:
            print(f"  Warning: Failed to load {json_file}: {e}")
    return files


async def migrate_engines(session: AsyncSession, analyzer_path: Path) -> int:
    """Migrate engine definitions."""
    print("\nMigrating engines...")
    engines_dir = analyzer_path / "src" / "engines" / "definitions"

    if not engines_dir.exists():
        print(f"  Error: Engines directory not found: {engines_dir}")
        return 0

    engine_data = load_json_files(engines_dir)
    print(f"  Found {len(engine_data)} engine definitions")

    migrated = 0
    for data in engine_data:
        try:
            # Check if engine already exists
            existing = await session.execute(
                select(Engine).where(Engine.engine_key == data.get("engine_key"))
            )
            if existing.scalar_one_or_none():
                print(f"  Skipping {data.get('engine_key')} (already exists)")
                continue

            engine = Engine(
                engine_key=data["engine_key"],
                engine_name=data.get("engine_name", data["engine_key"]),
                description=data.get("description", ""),
                version=data.get("version", 1),
                category=data.get("category", "concepts"),
                kind=data.get("kind", "primitive"),
                reasoning_domain=data.get("reasoning_domain"),
                researcher_question=data.get("researcher_question"),
                extraction_prompt=data.get("extraction_prompt", ""),
                curation_prompt=data.get("curation_prompt", ""),
                concretization_prompt=data.get("concretization_prompt"),
                canonical_schema=data.get("canonical_schema", {}),
                extraction_focus=data.get("extraction_focus", []),
                primary_output_modes=data.get("primary_output_modes", []),
                paradigm_keys=data.get("paradigm_keys", []),
                status="active",
            )
            session.add(engine)
            await session.flush()

            # Create initial version
            version = EngineVersion(
                engine_id=engine.id,
                version=1,
                full_snapshot=engine.to_dict(),
                change_summary="Initial import from analyzer-v2",
            )
            session.add(version)

            migrated += 1
            if migrated % 20 == 0:
                print(f"  Migrated {migrated} engines...")

        except Exception as e:
            print(f"  Error migrating {data.get('engine_key', 'unknown')}: {e}")

    print(f"  Migrated {migrated} engines successfully")
    return migrated


async def migrate_paradigms(session: AsyncSession, analyzer_path: Path) -> int:
    """Migrate paradigm definitions."""
    print("\nMigrating paradigms...")
    paradigms_dir = analyzer_path / "src" / "paradigms" / "instances"

    if not paradigms_dir.exists():
        print(f"  Error: Paradigms directory not found: {paradigms_dir}")
        return 0

    paradigm_data = load_json_files(paradigms_dir)
    print(f"  Found {len(paradigm_data)} paradigm definitions")

    migrated = 0
    for data in paradigm_data:
        try:
            # Check if paradigm already exists
            existing = await session.execute(
                select(Paradigm).where(Paradigm.paradigm_key == data.get("paradigm_key"))
            )
            if existing.scalar_one_or_none():
                print(f"  Skipping {data.get('paradigm_key')} (already exists)")
                continue

            paradigm = Paradigm(
                paradigm_key=data["paradigm_key"],
                paradigm_name=data.get("paradigm_name", data["paradigm_key"]),
                version=data.get("version", "1.0.0"),
                description=data.get("description", ""),
                guiding_thinkers=data.get("guiding_thinkers", ""),
                foundational=data.get("foundational", {}),
                structural=data.get("structural", {}),
                dynamic=data.get("dynamic", {}),
                explanatory=data.get("explanatory", {}),
                active_traits=data.get("active_traits", []),
                trait_definitions=data.get("trait_definitions", []),
                critique_patterns=data.get("critique_patterns", []),
                historical_context=data.get("historical_context"),
                related_paradigms=data.get("related_paradigms", []),
                primary_engines=data.get("primary_engines", []),
                compatible_engines=data.get("compatible_engines", []),
                status="active",
            )
            session.add(paradigm)
            migrated += 1

        except Exception as e:
            print(f"  Error migrating {data.get('paradigm_key', 'unknown')}: {e}")

    print(f"  Migrated {migrated} paradigms successfully")
    return migrated


async def migrate_chains(session: AsyncSession, analyzer_path: Path) -> int:
    """Migrate chain definitions as pipelines."""
    print("\nMigrating chains (as pipelines)...")
    chains_dir = analyzer_path / "src" / "chains" / "definitions"

    if not chains_dir.exists():
        print(f"  Error: Chains directory not found: {chains_dir}")
        return 0

    chain_data = load_json_files(chains_dir)
    print(f"  Found {len(chain_data)} chain definitions")

    migrated = 0
    for data in chain_data:
        try:
            # Check if pipeline already exists
            existing = await session.execute(
                select(Pipeline).where(Pipeline.pipeline_key == data.get("chain_key"))
            )
            if existing.scalar_one_or_none():
                print(f"  Skipping {data.get('chain_key')} (already exists)")
                continue

            pipeline = Pipeline(
                pipeline_key=data["chain_key"],
                pipeline_name=data.get("chain_name", data["chain_key"]),
                description=data.get("description", ""),
                blend_mode=data.get("blend_mode", "sequential"),
                category=data.get("category"),
                stage_definitions=[],
                status="active",
            )
            session.add(pipeline)
            await session.flush()

            # Create stages from engine_keys
            engine_keys = data.get("engine_keys", [])
            for i, engine_key in enumerate(engine_keys):
                stage = PipelineStage(
                    pipeline_id=pipeline.id,
                    stage_order=i,
                    stage_name=f"Stage {i + 1}: {engine_key}",
                    engine_key=engine_key,
                    pass_context=data.get("pass_context", True),
                    config={},
                )
                session.add(stage)

            migrated += 1

        except Exception as e:
            print(f"  Error migrating {data.get('chain_key', 'unknown')}: {e}")

    print(f"  Migrated {migrated} chains/pipelines successfully")
    return migrated


async def main():
    parser = argparse.ArgumentParser(description="Migrate JSON definitions to PostgreSQL")
    parser.add_argument(
        "--analyzer-path",
        type=Path,
        default=Path(os.getenv("ANALYZER_V2_PATH", "/home/admin/projects/analyzer-v2")),
        help="Path to analyzer-v2 project",
    )
    parser.add_argument(
        "--db-url",
        type=str,
        default=get_database_url(),
        help="Database URL",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't commit changes, just show what would be migrated",
    )
    args = parser.parse_args()

    print(f"Analyzer-v2 path: {args.analyzer_path}")
    print(f"Database URL: {args.db_url[:50]}...")

    # Verify analyzer-v2 path exists
    if not args.analyzer_path.exists():
        print(f"Error: Analyzer-v2 path not found: {args.analyzer_path}")
        sys.exit(1)

    # Create database engine and tables
    engine = create_async_engine(args.db_url, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # Migrate all definitions
            engines_count = await migrate_engines(session, args.analyzer_path)
            paradigms_count = await migrate_paradigms(session, args.analyzer_path)
            chains_count = await migrate_chains(session, args.analyzer_path)

            print("\n" + "=" * 50)
            print("Migration Summary")
            print("=" * 50)
            print(f"  Engines:   {engines_count}")
            print(f"  Paradigms: {paradigms_count}")
            print(f"  Pipelines: {chains_count}")
            print(f"  Total:     {engines_count + paradigms_count + chains_count}")

            if args.dry_run:
                print("\nDry run - rolling back changes...")
                await session.rollback()
            else:
                print("\nCommitting changes...")
                await session.commit()
                print("Migration complete!")

        except Exception as e:
            print(f"\nError during migration: {e}")
            await session.rollback()
            raise

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
