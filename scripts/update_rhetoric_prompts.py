#!/usr/bin/env python3
"""
Update rhetoric analyzers with actual prompts from the-critic.

Run: python scripts/update_rhetoric_prompts.py
"""

import json
import requests
import sys
from pathlib import Path

# API endpoint
API_BASE = "https://analyzer-mgmt-api.onrender.com/api/rhetoric"

# Path to the-critic analyzer files
CRITIC_ANALYZER_DIR = Path("/home/admin/projects/the-critic/analyzer")

# Mapping of rhetoric_key to analyzer file and prompt variable
PROMPT_SOURCES = {
    # Round 1 - Rhetoric (parameterized with {SUBJECT_AUTHOR}, {CRITIQUE_AUTHOR})
    "deflection": ("analyze_deflections.py", "DEFLECTION_PROMPT_TEMPLATE"),
    "contradiction": ("analyze_contradictions.py", "CONTRADICTION_PROMPT_TEMPLATE"),
    "silence": ("analyze_silence.py", "SILENCE_PROMPT_TEMPLATE"),
    "leap": ("analyze_leaps.py", "LEAPS_PROMPT_TEMPLATE"),
    "concession": ("analyze_concessions.py", "CONCESSIONS_PROMPT_TEMPLATE"),
    "retreat": ("analyze_retreats.py", "RETREATS_PROMPT_TEMPLATE"),
    "cherrypick": ("analyze_cherrypicks.py", "CHERRYPICKS_PROMPT_TEMPLATE"),
    "tuquoque": ("analyze_tuquoque.py", "TUQUOQUE_PROMPT_TEMPLATE"),
    "namedrop": ("analyze_namedrop.py", "NAMEDROP_PROMPT_TEMPLATE"),
    # Round 2 - Vulnerability (hardcoded authors - need manual parameterization)
    "strawman_risk": ("analyze_strawman_risk.py", "STRAWMAN_RISK_PROMPT"),
    "inconsistency": ("analyze_inconsistency.py", "INCONSISTENCY_PROMPT"),
    "logic_gap": ("analyze_logic_gap.py", "LOGIC_GAP_PROMPT"),
    "unanswered": ("analyze_unanswered.py", "UNANSWERED_PROMPT"),
    "overconcession": ("analyze_overconcession.py", "OVERCONCESSION_PROMPT"),
    "overreach": ("analyze_overreach.py", "OVERREACH_PROMPT"),
    "undercitation": ("analyze_undercitation.py", "UNDERCITATION_PROMPT"),
    "weak_authority": ("analyze_weak_authority.py", "WEAK_AUTHORITY_PROMPT"),
    "exposed_flank": ("analyze_exposed_flank.py", "EXPOSED_FLANK_PROMPT"),
}


def extract_prompt(file_path: Path, var_name: str) -> str:
    """Extract prompt template from Python file."""
    content = file_path.read_text()

    # Find the start of the variable assignment
    start_marker = f'{var_name} = """'
    alt_marker = f"{var_name} = '''"

    if start_marker in content:
        start = content.find(start_marker) + len(start_marker)
        end = content.find('"""', start)
    elif alt_marker in content:
        start = content.find(alt_marker) + len(alt_marker)
        end = content.find("'''", start)
    else:
        print(f"  WARNING: Could not find {var_name} in {file_path.name}")
        return None

    if end == -1:
        print(f"  WARNING: Could not find end of {var_name} in {file_path.name}")
        return None

    prompt = content[start:end]
    return prompt.strip()


def parameterize_vulnerability_prompt(prompt: str) -> str:
    """Convert hardcoded Benanav/Morozov to placeholders."""
    # Replace specific author names with placeholders
    replacements = [
        ("Benanav", "{SUBJECT_AUTHOR}"),
        ("Morozov", "{CRITIQUE_AUTHOR}"),
        ("benanav", "{SUBJECT_AUTHOR}"),
        ("morozov", "{CRITIQUE_AUTHOR}"),
    ]

    for old, new in replacements:
        prompt = prompt.replace(old, new)

    return prompt


def update_rhetoric(key: str, prompt: str) -> bool:
    """Update a rhetoric analyzer via API."""
    url = f"{API_BASE}/{key}"
    payload = {
        "prompt_template": prompt,
        "change_summary": "Updated with actual prompt from the-critic"
    }

    try:
        response = requests.put(url, json=payload)
        if response.status_code == 200:
            return True
        else:
            print(f"  ERROR: {response.status_code} - {response.text[:200]}")
            return False
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def main():
    print("Updating rhetoric prompts from the-critic...")
    print(f"API: {API_BASE}")
    print(f"Source: {CRITIC_ANALYZER_DIR}")
    print()

    success = 0
    failed = 0

    for key, (filename, var_name) in PROMPT_SOURCES.items():
        print(f"Processing {key}...")

        file_path = CRITIC_ANALYZER_DIR / filename
        if not file_path.exists():
            print(f"  SKIP: File not found: {filename}")
            failed += 1
            continue

        prompt = extract_prompt(file_path, var_name)
        if not prompt:
            failed += 1
            continue

        # Parameterize vulnerability prompts (Round 2)
        if key in ["strawman_risk", "inconsistency", "logic_gap", "unanswered",
                   "overconcession", "overreach", "undercitation", "weak_authority", "exposed_flank"]:
            prompt = parameterize_vulnerability_prompt(prompt)
            print(f"  Parameterized (converted Benanav/Morozov to placeholders)")

        print(f"  Prompt length: {len(prompt)} chars")

        if update_rhetoric(key, prompt):
            print(f"  ✓ Updated {key}")
            success += 1
        else:
            failed += 1

    print()
    print(f"Done: {success} updated, {failed} failed")


if __name__ == "__main__":
    main()
