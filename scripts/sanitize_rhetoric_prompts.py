#!/usr/bin/env python3
"""
Sanitize rhetoric prompts to remove all hardcoded author references.

This script fetches current prompts from the API, removes all specific
author names, publication references, and gendered pronouns, then updates
the prompts to be fully generic.

Run: python scripts/sanitize_rhetoric_prompts.py
"""

import json
import re
import requests

# API endpoint
API_BASE = "https://analyzer-mgmt-api.onrender.com/api/rhetoric"

# All rhetoric keys
RHETORIC_KEYS = [
    # Round 1 - Rhetoric
    "deflection", "contradiction", "silence", "leap", "concession",
    "retreat", "cherrypick", "tuquoque", "namedrop",
    # Round 2 - Vulnerability
    "strawman_risk", "inconsistency", "logic_gap", "unanswered",
    "overconcession", "overreach", "undercitation", "weak_authority", "exposed_flank",
]

# Patterns to remove/replace
SANITIZATION_RULES = [
    # Remove first names before placeholders
    (r"Aaron\s*\{SUBJECT_AUTHOR\}", "{SUBJECT_AUTHOR}"),
    (r"Evgeny\s*\{CRITIQUE_AUTHOR\}", "{CRITIQUE_AUTHOR}"),
    (r"Aaron\s*\{RESPONSE_AUTHOR\}", "{RESPONSE_AUTHOR}"),
    (r"Evgeny\s*\{USER_AUTHOR\}", "{USER_AUTHOR}"),

    # Remove standalone first names
    (r"\bAaron\b", "{SUBJECT_AUTHOR}"),
    (r"\bEvgeny\b", "{CRITIQUE_AUTHOR}"),

    # Remove full names
    (r"\bAaron Benanav\b", "{SUBJECT_AUTHOR}"),
    (r"\bBenanav\b", "{SUBJECT_AUTHOR}"),
    (r"\bEvgeny Morozov\b", "{CRITIQUE_AUTHOR}"),
    (r"\bMorozov\b", "{CRITIQUE_AUTHOR}"),

    # Remove specific publication references
    (r"\(NLR 153,?\s*154\)", ""),
    (r"\(NLR \d+\)", ""),
    (r"NLR 153,?\s*154", "the original essays"),
    (r"NLR \d+", "the publication"),

    # Remove specific essay titles
    (r'"Socialism After AI"', "the critique essay"),
    (r"\"Socialism After AI\"", "the critique essay"),
    (r"'Socialism After AI'", "the critique essay"),

    # Make gendered pronouns neutral (for critique author context)
    (r"\bhis counter-response\b", "their counter-response"),
    (r"\bHis counter-response\b", "Their counter-response"),
    (r"\bhis first essay\b", "their first essay"),
    (r"\bHis first essay\b", "Their first essay"),
    (r"\bhis framework\b", "their framework"),
    (r"\bHis framework\b", "Their framework"),
    (r"\bhis position\b", "their position"),
    (r"\bHis position\b", "Their position"),
    (r"\bhis argument\b", "their argument"),
    (r"\bHis argument\b", "Their argument"),
    (r"\bhis response\b", "their response"),
    (r"\bHis response\b", "Their response"),
    (r"\bhis original\b", "their original"),
    (r"\bHis original\b", "Their original"),
    (r"\bhis essay\b", "their essay"),
    (r"\bHis essay\b", "Their essay"),
    (r"\bhis claims\b", "their claims"),
    (r"\bHis claims\b", "Their claims"),
    (r"\bhis critique\b", "their critique"),
    (r"\bHis critique\b", "Their critique"),
    (r"\bhis practice\b", "their practice"),
    (r"\bHis practice\b", "Their practice"),
    (r"\bhe criticizes\b", "they criticize"),
    (r"\bHe criticizes\b", "They criticize"),
    (r"\bhe claims\b", "they claim"),
    (r"\bHe claims\b", "They claim"),
    (r"\bhe argues\b", "they argue"),
    (r"\bHe argues\b", "They argue"),
    (r"\bhe does\b", "they do"),
    (r"\bHe does\b", "They do"),
    (r"\bhe himself\b", "they themselves"),
    (r"\bHe himself\b", "They themselves"),
    (r"\bhimself\b", "themselves"),
    (r"\bHimself\b", "Themselves"),

    # More general pronoun patterns
    (r"\bwhat he doesn't\b", "what they don't"),
    (r"\bWhat he doesn't\b", "What they don't"),
    (r"\bhe doesn't\b", "they don't"),
    (r"\bHe doesn't\b", "They don't"),
    (r"\bhe didn't\b", "they didn't"),
    (r"\bHe didn't\b", "They didn't"),
    (r"\bhe has\b", "they have"),
    (r"\bHe has\b", "They have"),
    (r"\bhe had\b", "they had"),
    (r"\bHe had\b", "They had"),
    (r"\bhe is\b", "they are"),
    (r"\bHe is\b", "They are"),
    (r"\bhe was\b", "they were"),
    (r"\bHe was\b", "They were"),
    (r"\bhe would\b", "they would"),
    (r"\bHe would\b", "They would"),
    (r"\bhe could\b", "they could"),
    (r"\bHe could\b", "They could"),
    (r"\bhe should\b", "they should"),
    (r"\bHe should\b", "They should"),
    (r"\bhe will\b", "they will"),
    (r"\bHe will\b", "They will"),
    (r"\bhe may\b", "they may"),
    (r"\bHe may\b", "They may"),
    (r"\bhe might\b", "they might"),
    (r"\bHe might\b", "They might"),
    (r"\bhe can\b", "they can"),
    (r"\bHe can\b", "They can"),
    (r"\bhe must\b", "they must"),
    (r"\bHe must\b", "They must"),
    (r"\bhe fails\b", "they fail"),
    (r"\bHe fails\b", "They fail"),
    (r"\bhe offers\b", "they offer"),
    (r"\bHe offers\b", "They offer"),
    (r"\bhe makes\b", "they make"),
    (r"\bHe makes\b", "They make"),
    (r"\bhe uses\b", "they use"),
    (r"\bHe uses\b", "They use"),
    (r"\bhe wants\b", "they want"),
    (r"\bHe wants\b", "They want"),
    (r"\bhe needs\b", "they need"),
    (r"\bHe needs\b", "They need"),
    (r"\bhe says\b", "they say"),
    (r"\bHe says\b", "They say"),
    (r"\bhe writes\b", "they write"),
    (r"\bHe writes\b", "They write"),
    (r"\bhe acknowledges\b", "they acknowledge"),
    (r"\bHe acknowledges\b", "They acknowledge"),
    (r"\bhis own\b", "their own"),
    (r"\bHis own\b", "Their own"),
    (r"\bhis work\b", "their work"),
    (r"\bHis work\b", "Their work"),
    (r"\bhis analysis\b", "their analysis"),
    (r"\bHis analysis\b", "Their analysis"),
    (r"\bhis view\b", "their view"),
    (r"\bHis view\b", "Their view"),
    (r"\bhis views\b", "their views"),
    (r"\bHis views\b", "Their views"),
    (r"\bhis approach\b", "their approach"),
    (r"\bHis approach\b", "Their approach"),
    (r"\bhis point\b", "their point"),
    (r"\bHis point\b", "Their point"),
    (r"\bhis points\b", "their points"),
    (r"\bHis points\b", "Their points"),

    # More "he" verb patterns (no explicit object)
    (r"\bhe demands\b", "they demand"),
    (r"\bHe demands\b", "They demand"),
    (r"\bhe refuses\b", "they refuse"),
    (r"\bHe refuses\b", "They refuse"),
    (r"\bhe invokes\b", "they invoke"),
    (r"\bHe invokes\b", "They invoke"),
    (r"\bhis case\b", "their case"),
    (r"\bHis case\b", "Their case"),

    # More contextual "he/his" patterns
    (r"\bwhere he characterizes\b", "where they characterize"),
    (r"\bWhere he characterizes\b", "Where they characterize"),
    (r"\bwhere he:\b", "where they:"),
    (r"\bWhere he:\b", "Where they:"),
    (r"\bhis actual claim\b", "their actual claim"),
    (r"\bHis actual claim\b", "Their actual claim"),
    (r"\bhis counter-attack\b", "their counter-attack"),
    (r"\bHis counter-attack\b", "Their counter-attack"),
    (r"\bhis Response\b", "their Response"),
    (r"\bHis Response\b", "Their Response"),
    (r"\bhis challenge\b", "their challenge"),
    (r"\bHis challenge\b", "Their challenge"),
    (r"\bvisible in his\b", "visible in their"),
    (r"\bVisible in his\b", "Visible in their"),
    (r"\bframe his\b", "frame their"),
    (r"\bFrame his\b", "Frame their"),
    (r"\bphrase his\b", "phrase their"),
    (r"\bPhrase his\b", "Phrase their"),

    # More verb/pronoun patterns
    (r"\ballows him to\b", "allows them to"),
    (r"\bAllows him to\b", "Allows them to"),
    (r"\bhe now claims\b", "they now claim"),
    (r"\bHe now claims\b", "They now claim"),
    (r"\bhe now\b", "they now"),
    (r"\bHe now\b", "They now"),
    (r"\bUntil he\b", "Until they"),
    (r"\buntil he\b", "until they"),
    (r"\bhis concession\b", "their concession"),
    (r"\bHis concession\b", "Their concession"),
    (r"\bHis implicit\b", "Their implicit"),
    (r"\bhis implicit\b", "their implicit"),
    (r"\bthan he admits\b", "than they admit"),
    (r"\bThan he admits\b", "Than they admit"),
    (r"\bthis, he\b", "this, they"),
    (r"\bThis, he\b", "This, they"),
    (r"\bdoes he merely\b", "do they merely"),
    (r"\bDoes he merely\b", "Do they merely"),
    (r"\bIf he only\b", "If they only"),
    (r"\bif he only\b", "if they only"),
    (r"\bBut he never\b", "But they never"),
    (r"\bbut he never\b", "but they never"),
    (r"\bhis premises\b", "their premises"),
    (r"\bHis premises\b", "Their premises"),
    (r"\bHis arguments\b", "Their arguments"),
    (r"\bhis system\b", "their system"),
    (r"\bHis system\b", "Their system"),
    (r"\bhis quote\b", "their quote"),
    (r"\bHis quote\b", "Their quote"),
    (r"\bhe addresses\b", "they address"),
    (r"\bHe addresses\b", "They address"),
    (r"\bundermines his claim\b", "undermines their claim"),
    (r"\bUndermines his claim\b", "Undermines their claim"),
    (r"\bwhat his arguments support\b", "what their arguments support"),
    (r"\bWhat his arguments support\b", "What their arguments support"),
    (r"response where he:", "response where they:"),
    (r"Response where he:", "Response where they:"),

    # Hardcoded section headers
    (r"HELP MOROZOV WIN", "HELP THE CRITIC WIN"),
    (r"CRITICAL: HELP MOROZOV WIN", "CRITICAL: HELP THE CRITIC WIN"),
    (r"THE BENANAV ATTACK PATTERN", "THE SUBJECT AUTHOR'S ATTACK PATTERN"),

    # Clean up double placeholders that might result
    (r"\{SUBJECT_AUTHOR\}\s*\{SUBJECT_AUTHOR\}", "{SUBJECT_AUTHOR}"),
    (r"\{CRITIQUE_AUTHOR\}\s*\{CRITIQUE_AUTHOR\}", "{CRITIQUE_AUTHOR}"),

    # Clean up any remaining "the earlier {CRITIQUE_AUTHOR}"
    (r"the earlier \{CRITIQUE_AUTHOR\}", "the earlier version of {CRITIQUE_AUTHOR}'s argument"),

    # Fix double spaces
    (r"  +", " "),

    # Fix spaces before punctuation
    (r" +\.", "."),
    (r" +,", ","),
    (r" +:", ":"),
]


def sanitize_prompt(prompt: str) -> str:
    """Apply all sanitization rules to a prompt."""
    result = prompt

    for pattern, replacement in SANITIZATION_RULES:
        result = re.sub(pattern, replacement, result)

    return result


def get_prompt(key: str) -> str:
    """Fetch current prompt from API."""
    url = f"{API_BASE}/{key}"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        return data.get("prompt_template", "")
    return None


def update_prompt(key: str, prompt: str) -> bool:
    """Update prompt via API."""
    url = f"{API_BASE}/{key}"
    payload = {
        "prompt_template": prompt,
        "change_summary": "Sanitized to remove hardcoded author names and make fully generic"
    }
    response = requests.put(url, json=payload)
    return response.status_code == 200


def main():
    print("Sanitizing rhetoric prompts...")
    print(f"API: {API_BASE}")
    print()

    success = 0
    failed = 0
    unchanged = 0

    for key in RHETORIC_KEYS:
        print(f"Processing {key}...")

        # Get current prompt
        original = get_prompt(key)
        if not original:
            print(f"  ERROR: Could not fetch prompt")
            failed += 1
            continue

        # Sanitize
        sanitized = sanitize_prompt(original)

        # Check if changed
        if sanitized == original:
            print(f"  No changes needed")
            unchanged += 1
            continue

        # Show what changed
        changes = []
        for pattern, replacement in SANITIZATION_RULES:
            if re.search(pattern, original):
                changes.append(f"    - {pattern[:40]}...")

        if changes:
            print(f"  Found patterns to replace:")
            for c in changes[:5]:
                print(c)
            if len(changes) > 5:
                print(f"    ... and {len(changes) - 5} more")

        # Update
        if update_prompt(key, sanitized):
            print(f"  ✓ Updated {key}")
            success += 1
        else:
            print(f"  ERROR: Failed to update")
            failed += 1

    print()
    print(f"Done: {success} updated, {unchanged} unchanged, {failed} failed")


if __name__ == "__main__":
    main()
