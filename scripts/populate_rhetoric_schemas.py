#!/usr/bin/env python3
"""
Populate output schemas for all rhetoric analyzers.

This script defines proper JSON schemas for each rhetoric analyzer
based on the OUTPUT FORMAT sections in their prompts.

Run: python scripts/populate_rhetoric_schemas.py
"""

import json
import requests

# API endpoint
API_BASE = "https://analyzer-mgmt-api.onrender.com/api/rhetoric"

# Output schemas for each rhetoric analyzer
RHETORIC_SCHEMAS = {
    # Round 1 - Rhetoric (analyze subject's response)
    "deflection": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "deflection_claim": {"type": "string", "description": "The subject author's claim that the critique author misunderstands - VERBATIM"},
                "deflection_source": {"type": "string", "description": "Location in response"},
                "critique_evidence": {"type": "string", "description": "Quote from critique showing the point WAS addressed - VERBATIM"},
                "critique_source": {"type": "string", "description": "Location in critique"},
                "deflection_type": {"type": "string", "enum": ["misreading_accusation", "scope_shift", "context_dodge", "definition_game"]},
                "analysis": {"type": "string", "description": "Detailed analysis"},
                "counter_response": {"type": "string", "description": "Example counter-response"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["deflection_claim", "critique_evidence", "deflection_type", "analysis", "severity"]
        }
    },
    "contradiction": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "response_claim": {"type": "string", "description": "What the subject author claims in their response - VERBATIM"},
                "response_source": {"type": "string", "description": "Location in response"},
                "original_claim": {"type": "string", "description": "What the subject author originally wrote - VERBATIM"},
                "original_source": {"type": "string", "description": "Location in original essays"},
                "contradiction_type": {"type": "string", "enum": ["direct_contradiction", "scope_change", "retroactive_reframe", "selective_emphasis"]},
                "analysis": {"type": "string", "description": "Detailed analysis of the contradiction"},
                "counter_response": {"type": "string", "description": "Example counter-response"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["response_claim", "original_claim", "contradiction_type", "analysis", "severity"]
        }
    },
    "silence": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "unanswered_challenge": {"type": "string", "description": "The specific challenge from the critique - VERBATIM"},
                "challenge_source": {"type": "string", "description": "Location in critique"},
                "challenge_type": {"type": "string", "enum": ["direct_question", "counterexample", "demand_for_mechanism", "logical_objection", "empirical_challenge"]},
                "search_conducted": {"type": "string", "description": "Where you looked in the response"},
                "closest_response": {"type": "string", "description": "Nearest thing to an answer, if any"},
                "why_insufficient": {"type": "string", "description": "Why the closest response doesn't actually address the challenge"},
                "significance": {"type": "string", "description": "Why this silence matters"},
                "counter_response": {"type": "string", "description": "Example counter-response"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["unanswered_challenge", "challenge_type", "significance", "severity"]
        }
    },
    "leap": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "attributed_position": {"type": "string", "description": "What the subject author claims the critique author said/implied - VERBATIM"},
                "attribution_source": {"type": "string", "description": "Location in response"},
                "actual_text": {"type": "string", "description": "What the critique author actually wrote - VERBATIM"},
                "actual_source": {"type": "string", "description": "Location in critique"},
                "leap_type": {"type": "string", "enum": ["phantom_premise", "unwarranted_inference", "scope_expansion", "motivation_attribution"]},
                "gap_analysis": {"type": "string", "description": "Detailed analysis of the gap between attributed and actual"},
                "counter_response": {"type": "string", "description": "Example counter-response"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["attributed_position", "actual_text", "leap_type", "gap_analysis", "severity"]
        }
    },
    "concession": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "original_position": {"type": "string", "description": "What the subject author originally claimed - VERBATIM"},
                "original_source": {"type": "string", "description": "Location in original essays"},
                "shifted_position": {"type": "string", "description": "How the position appears in the response - VERBATIM"},
                "shifted_source": {"type": "string", "description": "Location in response"},
                "critique_point": {"type": "string", "description": "The critique that prompted this shift - VERBATIM"},
                "critique_source": {"type": "string", "description": "Location in critique"},
                "concession_type": {"type": "string", "enum": ["qualification_added", "scope_narrowed", "framing_changed", "emphasis_shifted", "silent_adoption"]},
                "analysis": {"type": "string", "description": "Why this constitutes a silent concession"},
                "counter_response": {"type": "string", "description": "Example counter-response"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["original_position", "shifted_position", "concession_type", "analysis", "severity"]
        }
    },
    "retreat": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "original_claim": {"type": "string", "description": "The stronger original claim - VERBATIM"},
                "original_source": {"type": "string", "description": "Location in original essays"},
                "retreated_claim": {"type": "string", "description": "The weaker 'clarified' version - VERBATIM"},
                "retreated_source": {"type": "string", "description": "Location in response"},
                "retreat_type": {"type": "string", "enum": ["scope_narrowing", "certainty_reduction", "claim_weakening", "exception_adding", "definition_shifting"]},
                "what_changed": {"type": "string", "description": "Specific analysis of what was retreated"},
                "counter_response": {"type": "string", "description": "Example counter-response"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["original_claim", "retreated_claim", "retreat_type", "what_changed", "severity"]
        }
    },
    "cherrypick": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "quoted_text": {"type": "string", "description": "What the subject author quotes - VERBATIM"},
                "quote_source": {"type": "string", "description": "Location in response"},
                "full_context": {"type": "string", "description": "The full passage from the critique - VERBATIM"},
                "context_source": {"type": "string", "description": "Location in critique"},
                "cherrypick_type": {"type": "string", "enum": ["truncation", "context_removal", "selective_emphasis", "meaning_distortion"]},
                "what_was_omitted": {"type": "string", "description": "What the truncation/selection hides"},
                "how_meaning_changes": {"type": "string", "description": "How the meaning differs when full context is restored"},
                "counter_response": {"type": "string", "description": "Example counter-response"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["quoted_text", "full_context", "cherrypick_type", "what_was_omitted", "severity"]
        }
    },
    "tuquoque": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "original_critique": {"type": "string", "description": "The critique's original challenge - VERBATIM"},
                "critique_source": {"type": "string", "description": "Location in critique"},
                "tuquoque_response": {"type": "string", "description": "The subject author's 'you too' deflection - VERBATIM"},
                "response_source": {"type": "string", "description": "Location in response"},
                "does_critique_actually_do_it": {"type": "boolean", "description": "Does the critique author actually do the thing?"},
                "substantive_answer_provided": {"type": "boolean", "description": "Did the subject author also provide a real answer?"},
                "analysis": {"type": "string", "description": "Why this is a deflection rather than an answer"},
                "counter_response": {"type": "string", "description": "Example counter-response"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["original_critique", "tuquoque_response", "does_critique_actually_do_it", "substantive_answer_provided", "analysis", "severity"]
        }
    },
    "namedrop": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "authority_invoked": {"type": "string", "description": "The theorist/authority named"},
                "invocation_passage": {"type": "string", "description": "How the subject author invokes them - VERBATIM"},
                "invocation_source": {"type": "string", "description": "Location in response"},
                "claim_being_supported": {"type": "string", "description": "What point the authority supposedly supports"},
                "namedrop_type": {"type": "string", "enum": ["unexplained_invocation", "misattribution", "selective_use", "authority_mismatch"]},
                "missing_connection": {"type": "string", "description": "What's missing in the argument"},
                "counter_response": {"type": "string", "description": "Example counter-response"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["authority_invoked", "invocation_passage", "claim_being_supported", "namedrop_type", "missing_connection", "severity"]
        }
    },

    # Round 2 - Vulnerability (analyze critique author's counter-response)
    "strawman_risk": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "vulnerable_passage": {"type": "string", "description": "Quote from counter-response characterizing the subject author - VERBATIM"},
                "vulnerable_source": {"type": "string", "description": "Location in counter-response"},
                "subject_actual_text": {"type": "string", "description": "What the subject author actually wrote - VERBATIM"},
                "subject_source": {"type": "string", "description": "Location in subject's texts"},
                "subject_attack": {"type": "string", "description": "How the subject author could frame their counter-attack"},
                "strawman_type": {"type": "string", "enum": ["attribution_error", "oversimplification", "conflation", "exaggeration"]},
                "suggested_revision": {"type": "string", "description": "How to rewrite the passage accurately"},
                "analysis": {"type": "string", "description": "Detailed analysis with inline quotes"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["vulnerable_passage", "subject_actual_text", "strawman_type", "suggested_revision", "severity"]
        }
    },
    "inconsistency": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "statement_one": {"type": "string", "description": "First conflicting statement - VERBATIM"},
                "source_one": {"type": "string", "description": "Location of first statement"},
                "statement_two": {"type": "string", "description": "Second conflicting statement - VERBATIM"},
                "source_two": {"type": "string", "description": "Location of second statement"},
                "inconsistency_type": {"type": "string", "enum": ["direct_contradiction", "tension", "evolution", "context_dependent"]},
                "why_problematic": {"type": "string", "description": "Why this inconsistency matters"},
                "subject_attack": {"type": "string", "description": "How the subject author could exploit this"},
                "suggested_resolution": {"type": "string", "description": "How to resolve the inconsistency"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["statement_one", "statement_two", "inconsistency_type", "why_problematic", "severity"]
        }
    },
    "logic_gap": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "vulnerable_passage": {"type": "string", "description": "The passage containing the logic gap - VERBATIM"},
                "vulnerable_source": {"type": "string", "description": "Location in counter-response"},
                "premise": {"type": "string", "description": "What the critique author establishes"},
                "gap_type": {"type": "string", "enum": ["non_sequitur", "hidden_premise", "false_dichotomy", "hasty_generalization", "circular_reasoning", "equivocation"]},
                "conclusion": {"type": "string", "description": "What the critique author infers"},
                "missing_link": {"type": "string", "description": "What would need to be true for the inference to work"},
                "subject_attack": {"type": "string", "description": "How the subject author could challenge this"},
                "suggested_fix": {"type": "string", "description": "How to strengthen the argument"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["vulnerable_passage", "premise", "conclusion", "gap_type", "missing_link", "severity"]
        }
    },
    "unanswered": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "subject_point": {"type": "string", "description": "The argument from the subject author's response - VERBATIM"},
                "subject_source": {"type": "string", "description": "Location in subject's response"},
                "point_type": {"type": "string", "enum": ["direct_challenge", "counterexample", "question", "alternative_explanation", "framework_defense"]},
                "search_conducted": {"type": "string", "description": "Where you looked in the counter-response"},
                "why_unanswered": {"type": "string", "description": "Why the critique author's counter-response doesn't address this"},
                "subject_attack": {"type": "string", "description": "How the subject author could exploit the silence"},
                "suggested_response": {"type": "string", "description": "How to address this point"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["subject_point", "point_type", "why_unanswered", "severity"]
        }
    },
    "overconcession": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "concession_passage": {"type": "string", "description": "The over-concession - VERBATIM"},
                "concession_source": {"type": "string", "description": "Location in counter-response"},
                "original_position": {"type": "string", "description": "What the critique author argued in their first essay"},
                "concession_type": {"type": "string", "enum": ["undermining", "unnecessary_hedge", "ammunition_provision", "retreat"]},
                "what_it_undermines": {"type": "string", "description": "How this concession weakens the critique author's position"},
                "subject_attack": {"type": "string", "description": "How the subject author would use this"},
                "suggested_revision": {"type": "string", "description": "How to reframe without over-conceding"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["concession_passage", "concession_type", "what_it_undermines", "severity"]
        }
    },
    "overreach": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "overreach_passage": {"type": "string", "description": "The overreaching claim - VERBATIM"},
                "overreach_source": {"type": "string", "description": "Location in counter-response"},
                "overreach_type": {"type": "string", "enum": ["overgeneralization", "overclaims_certainty", "causal_overreach", "straw_magnification"]},
                "what_evidence_supports": {"type": "string", "description": "What the evidence actually supports"},
                "what_is_claimed": {"type": "string", "description": "What the critique author claims"},
                "subject_attack": {"type": "string", "description": "How the subject author could exploit this"},
                "qualified_version": {"type": "string", "description": "A defensible version of the claim"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["overreach_passage", "overreach_type", "what_evidence_supports", "what_is_claimed", "severity"]
        }
    },
    "undercitation": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "vulnerable_passage": {"type": "string", "description": "The unsupported claim - VERBATIM"},
                "vulnerable_source": {"type": "string", "description": "Location in counter-response"},
                "claim_type": {"type": "string", "enum": ["framework_characterization", "position_attribution", "implication_claim", "motivation_attribution", "absence_claim"]},
                "evidence_needed": {"type": "string", "description": "What textual evidence would ground this claim"},
                "evidence_exists": {"type": "boolean", "description": "Does such evidence exist in the subject's texts?"},
                "evidence_location": {"type": "string", "description": "Where the evidence is, if it exists"},
                "subject_attack": {"type": "string", "description": "How the subject author would challenge this"},
                "suggested_fix": {"type": "string", "description": "How to add citation or reframe"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["vulnerable_passage", "claim_type", "evidence_needed", "evidence_exists", "severity"]
        }
    },
    "weak_authority": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "authority_passage": {"type": "string", "description": "The critique author's invocation - VERBATIM"},
                "authority_source": {"type": "string", "description": "Location in counter-response"},
                "authority_invoked": {"type": "string", "description": "The theorist/authority cited"},
                "authority_actual_position": {"type": "string", "description": "What the authority actually argues"},
                "claim_being_defended": {"type": "string", "description": "What point the critique author uses this authority to support"},
                "weakness_type": {"type": "string", "enum": ["misrepresentation", "selective_reading", "outdated_position", "contested_interpretation", "tangential_relevance"]},
                "vulnerability": {"type": "string", "description": "Why this authority appeal is weak"},
                "subject_attack": {"type": "string", "description": "How the subject author could exploit this"},
                "suggested_fix": {"type": "string", "description": "How to strengthen or remove the appeal"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["authority_passage", "authority_invoked", "claim_being_defended", "weakness_type", "vulnerability", "severity"]
        }
    },
    "exposed_flank": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "vulnerable_passage": {"type": "string", "description": "Quote from counter-response criticizing the subject author - VERBATIM"},
                "vulnerable_source": {"type": "string", "description": "Location in counter-response"},
                "critique_type": {"type": "string", "enum": ["methodological", "substantive", "structural", "stylistic", "standard_invocation"]},
                "critique_author_exposure": {"type": "string", "description": "Where the critique author is vulnerable to the same critique"},
                "exposure_source": {"type": "string", "description": "Location of the exposure"},
                "subject_attack": {"type": "string", "description": "How the subject author would phrase the tu quoque"},
                "flank_type": {"type": "string", "enum": ["same_text_hypocrisy", "cross_text_hypocrisy", "structural_symmetry", "unmet_standard"]},
                "suggested_revision": {"type": "string", "description": "SPECIFIC suggestions for defense"},
                "analysis": {"type": "string", "description": "Detailed explanation of the vulnerability"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]}
            },
            "required": ["vulnerable_passage", "critique_type", "critique_author_exposure", "flank_type", "severity"]
        }
    },
}


def update_schema(key: str, schema: dict) -> bool:
    """Update output_schema for a rhetoric analyzer via API."""
    url = f"{API_BASE}/{key}"
    payload = {
        "output_schema": schema,
        "change_summary": "Added proper JSON schema for expected output format"
    }
    try:
        response = requests.put(url, json=payload)
        return response.status_code == 200
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def main():
    print("Populating output schemas for rhetoric analyzers...")
    print(f"API: {API_BASE}")
    print()

    success = 0
    failed = 0

    for key, schema in RHETORIC_SCHEMAS.items():
        print(f"Updating {key}...")

        if update_schema(key, schema):
            print(f"  ✓ Updated {key}")
            success += 1
        else:
            print(f"  ✗ Failed to update {key}")
            failed += 1

    print()
    print(f"Done: {success} updated, {failed} failed")


if __name__ == "__main__":
    main()
