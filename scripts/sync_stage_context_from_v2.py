#!/usr/bin/env python3
"""
Sync stage_context from analyzer-v2 to analyzer-mgmt database.

This script fetches engines from analyzer-v2 API and updates the
corresponding engines in analyzer-mgmt's database with stage_context.

Usage:
    python scripts/sync_stage_context_from_v2.py

Environment:
    DATABASE_URL: Connection string for analyzer-mgmt database
    ANALYZER_V2_URL: Base URL for analyzer-v2 API (default: https://analyzer-v2.onrender.com)
"""

import os
import sys
import httpx
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ANALYZER_V2_URL = os.environ.get("ANALYZER_V2_URL", "https://analyzer-v2.onrender.com")
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable required")
    print("Get it from Render dashboard for analyzer-mgmt-api")
    sys.exit(1)


def fetch_engines_from_v2() -> list[dict]:
    """Fetch all engines from analyzer-v2 API."""
    print(f"Fetching engines from {ANALYZER_V2_URL}/v1/engines...")

    with httpx.Client(timeout=60) as client:
        response = client.get(f"{ANALYZER_V2_URL}/v1/engines")
        response.raise_for_status()
        data = response.json()

    engines = data.get("items", data) if isinstance(data, dict) else data
    print(f"Found {len(engines)} engines")
    return engines


def fetch_engine_detail(engine_key: str) -> dict | None:
    """Fetch full engine detail including stage_context."""
    with httpx.Client(timeout=30) as client:
        try:
            response = client.get(f"{ANALYZER_V2_URL}/v1/engines/{engine_key}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"  Warning: Could not fetch {engine_key}: {e}")
            return None


def sync_stage_context():
    """Main sync function."""
    print("=" * 60)
    print("Syncing stage_context from analyzer-v2 to analyzer-mgmt")
    print("=" * 60)

    # Connect to database
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Get list of engines from v2
        v2_engines = fetch_engines_from_v2()

        updated = 0
        skipped = 0
        not_found = 0

        for v2_summary in v2_engines:
            engine_key = v2_summary.get("engine_key")
            has_stage_context = v2_summary.get("has_stage_context", False)

            if not has_stage_context:
                skipped += 1
                continue

            # Fetch full detail to get stage_context
            v2_detail = fetch_engine_detail(engine_key)
            if not v2_detail or not v2_detail.get("stage_context"):
                skipped += 1
                continue

            stage_context = v2_detail["stage_context"]

            # Check if engine exists in analyzer-mgmt
            result = session.execute(
                text("SELECT id, stage_context FROM engines WHERE engine_key = :key"),
                {"key": engine_key}
            ).fetchone()

            if not result:
                print(f"  {engine_key}: Not in mgmt DB")
                not_found += 1
                continue

            engine_id, existing_context = result

            if existing_context:
                print(f"  {engine_key}: Already has stage_context, skipping")
                skipped += 1
                continue

            # Update with stage_context
            import json
            session.execute(
                text("UPDATE engines SET stage_context = :ctx WHERE id = :id"),
                {"ctx": json.dumps(stage_context), "id": engine_id}
            )
            print(f"  {engine_key}: Updated with stage_context")
            updated += 1

        session.commit()

        print()
        print("=" * 60)
        print(f"Sync complete:")
        print(f"  Updated: {updated}")
        print(f"  Skipped: {skipped}")
        print(f"  Not in mgmt DB: {not_found}")
        print("=" * 60)

    finally:
        session.close()


if __name__ == "__main__":
    sync_stage_context()
