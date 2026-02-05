#!/usr/bin/env python3
"""
Seed script to populate rhetoric analyzers from the-critic.

Run: python scripts/seed_rhetoric.py
"""

import asyncio
import sys
import os

# Add API path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

from sqlalchemy import select
from models.database import async_session
from models.rhetoric import Rhetoric, RhetoricVersion


# ============================================================================
# Rhetoric Analyzer Definitions
# ============================================================================

RHETORIC_ANALYZERS = [
    # Round 1 - Rhetoric (9): Analyze subject's response
    {
        "rhetoric_key": "deflection",
        "name": "Deflection Analysis",
        "description": "Identifies instances where the subject author claims the critique author misunderstands their argument, but the critique actually addresses those very points textually.",
        "category": "rhetoric",
        "requires_subject": True,
        "requires_critique": True,
        "requires_response": True,
        "requires_counter_response": False,
    },
    {
        "rhetoric_key": "contradiction",
        "name": "Self-Contradictions Analysis",
        "description": "Identifies instances where the subject author's response claims things that go beyond, contradict, or retroactively reframe what they actually argued in their original essays (moving goalposts).",
        "category": "rhetoric",
        "requires_subject": True,
        "requires_critique": True,
        "requires_response": True,
        "requires_counter_response": False,
    },
    {
        "rhetoric_key": "silence",
        "name": "Silence Analysis",
        "description": "Identifies the critique author's specific questions, challenges, or provocations that the subject author simply doesn't address at all - conspicuous omissions that reveal inability or unwillingness to engage.",
        "category": "rhetoric",
        "requires_subject": True,
        "requires_critique": True,
        "requires_response": True,
        "requires_counter_response": False,
    },
    {
        "rhetoric_key": "leap",
        "name": "Logical Leaps Analysis",
        "description": "Identifies instances where the subject author attributes arguments or presuppositions to the critique author that don't follow from what the critique author actually wrote (phantom premises and wrong conclusions).",
        "category": "rhetoric",
        "requires_subject": True,
        "requires_critique": True,
        "requires_response": True,
        "requires_counter_response": False,
    },
    {
        "rhetoric_key": "concession",
        "name": "Concessions Analysis",
        "description": "Identifies places where the subject author implicitly agrees with the critique author through changed framing, added qualifications, or behavioral shifts - but without acknowledging the critique author was right.",
        "category": "rhetoric",
        "requires_subject": True,
        "requires_critique": True,
        "requires_response": True,
        "requires_counter_response": False,
    },
    {
        "rhetoric_key": "retreat",
        "name": "Retreats Analysis",
        "description": "Identifies \"clarifications\" that are actually substantive position changes - where the subject author weakens, narrows, or qualifies his claims while pretending to merely explain what he \"always meant.\"",
        "category": "rhetoric",
        "requires_subject": True,
        "requires_critique": False,
        "requires_response": True,
        "requires_counter_response": False,
    },
    {
        "rhetoric_key": "cherrypick",
        "name": "Cherry Picks Analysis",
        "description": "Identifies where the subject author quotes the critique author out of context, truncates quotes to change meaning, or selectively ignores parts of the critique author's argument that undermine his response.",
        "category": "rhetoric",
        "requires_subject": False,
        "requires_critique": True,
        "requires_response": True,
        "requires_counter_response": False,
    },
    {
        "rhetoric_key": "tuquoque",
        "name": "Tu Quoque Analysis",
        "description": "Identifies where the subject author deflects criticism by claiming the critique author has the same problem or faces the same challenge - even if true, this doesn't answer the original critique.",
        "category": "rhetoric",
        "requires_subject": False,
        "requires_critique": True,
        "requires_response": True,
        "requires_counter_response": False,
    },
    {
        "rhetoric_key": "namedrop",
        "name": "Name-Drop Analysis",
        "description": "Identifies where the subject author invokes theorists without showing how their work actually supports his specific claims - empty appeals to authority.",
        "category": "rhetoric",
        "requires_subject": True,
        "requires_critique": True,
        "requires_response": True,
        "requires_counter_response": False,
    },
    # Round 2 - Vulnerability (9): Analyze user's counter-response
    {
        "rhetoric_key": "strawman_risk",
        "name": "Strawman Risk Analysis",
        "description": "Identifies instances where the critique author might be accused of misrepresenting the subject author's position. Helps strengthen the critique author's arguments before publication.",
        "category": "vulnerability",
        "requires_subject": True,
        "requires_critique": False,
        "requires_response": True,
        "requires_counter_response": True,
    },
    {
        "rhetoric_key": "inconsistency",
        "name": "Inconsistency Analysis",
        "description": "Identifies instances where the critique author contradicts himself - either within his counter-response or between his first essay and his counter-response. Internal contradictions undermine credibility.",
        "category": "vulnerability",
        "requires_subject": False,
        "requires_critique": True,
        "requires_response": False,
        "requires_counter_response": True,
    },
    {
        "rhetoric_key": "logic_gap",
        "name": "Logic Gap Analysis",
        "description": "Identifies instances where the critique author's conclusions don't follow from his premises - logical leaps, non sequiturs, and unstated assumptions that could be challenged.",
        "category": "vulnerability",
        "requires_subject": False,
        "requires_critique": False,
        "requires_response": False,
        "requires_counter_response": True,
    },
    {
        "rhetoric_key": "unanswered",
        "name": "Unanswered Points Analysis",
        "description": "Identifies valid points from the subject author's response that the critique author fails to address in his counter-response. Ignoring strong arguments looks evasive.",
        "category": "vulnerability",
        "requires_subject": False,
        "requires_critique": False,
        "requires_response": True,
        "requires_counter_response": True,
    },
    {
        "rhetoric_key": "overconcession",
        "name": "Over-Concession Analysis",
        "description": "Identifies instances where the critique author concedes too much to the subject author, undermining his own argument or giving the subject author ammunition.",
        "category": "vulnerability",
        "requires_subject": False,
        "requires_critique": True,
        "requires_response": False,
        "requires_counter_response": True,
    },
    {
        "rhetoric_key": "overreach",
        "name": "Overreach Analysis",
        "description": "Identifies instances where the critique author extends his argument beyond defensible positions - overgeneralizations, unsupported claims of certainty, and arguments that exceed the evidence.",
        "category": "vulnerability",
        "requires_subject": False,
        "requires_critique": False,
        "requires_response": False,
        "requires_counter_response": True,
    },
    {
        "rhetoric_key": "undercitation",
        "name": "Under-Citation Analysis",
        "description": "Identifies instances where the critique author makes claims about the subject author's position WITHOUT sufficient textual support. These are passages vulnerable to \"Show me where I said that.\"",
        "category": "vulnerability",
        "requires_subject": True,
        "requires_critique": False,
        "requires_response": True,
        "requires_counter_response": True,
    },
    {
        "rhetoric_key": "weak_authority",
        "name": "Weak Authority Analysis",
        "description": "Identifies instances where the critique author invokes theorists whose positions may not actually support his claims, or where the invocation could be challenged.",
        "category": "vulnerability",
        "requires_subject": False,
        "requires_critique": False,
        "requires_response": False,
        "requires_counter_response": True,
    },
    {
        "rhetoric_key": "exposed_flank",
        "name": "Exposed Flank Analysis",
        "description": "Identifies instances where the critique author's critiques of the subject author could be turned back on the critique author himself. These are tu quoque opportunities.",
        "category": "vulnerability",
        "requires_subject": False,
        "requires_critique": True,
        "requires_response": True,
        "requires_counter_response": True,
    },
]


# ============================================================================
# Prompt Templates
# ============================================================================

PROMPTS = {
    "deflection": """You are a forensic analyst examining a scholarly exchange between {SUBJECT_AUTHOR} and {CRITIQUE_AUTHOR}. Your task is to identify instances of DEFLECTION - where {SUBJECT_AUTHOR} claims {CRITIQUE_AUTHOR} misunderstands their argument, but {CRITIQUE_AUTHOR}'s essay actually addresses those very points.

## CONTEXT

1. **{SUBJECT_AUTHOR}'s Original Essays**: These are {SUBJECT_AUTHOR}'s original arguments that {CRITIQUE_AUTHOR} critiques.

2. **{CRITIQUE_AUTHOR}'s Critique**: A critique of {SUBJECT_AUTHOR}'s framework.

3. **{SUBJECT_AUTHOR}'s Response**: {SUBJECT_AUTHOR}'s reply to {CRITIQUE_AUTHOR}, where they defend themselves against {CRITIQUE_AUTHOR}'s critiques.

## YOUR TASK

Find ALL instances where {SUBJECT_AUTHOR}, in their response:

1. **Claims {CRITIQUE_AUTHOR} misunderstands or misrepresents their position**
   - "{CRITIQUE_AUTHOR} seems to think I'm saying X, but I actually say Y"
   - "This misses the point of my argument"
   - "{CRITIQUE_AUTHOR} confuses X with Y"
   - "This is not what I argued"
   - Any defensive framing suggesting {CRITIQUE_AUTHOR} got it wrong

2. **BUT {CRITIQUE_AUTHOR}'s essay actually addresses that exact point**
   - {CRITIQUE_AUTHOR} textually engages with the nuance {SUBJECT_AUTHOR} claims they missed
   - {CRITIQUE_AUTHOR} anticipates and responds to the objection {SUBJECT_AUTHOR} raises
   - The supposed "misunderstanding" is actually just disagreement

This pattern - claiming misunderstanding when there is actual engagement - is a rhetorical DEFLECTION from substantive critique.

## CRITICAL REQUIREMENT: TEXTUAL GROUNDING

**EVERY claim about what {CRITIQUE_AUTHOR} or {SUBJECT_AUTHOR} says MUST include:**
1. The exact quoted text in quotation marks
2. The source in parentheses

**NEVER paraphrase without also providing the original quote.**

## OUTPUT FORMAT

For EACH deflection found, provide:

1. **subject_complaint**: The exact quote from {SUBJECT_AUTHOR}'s response where they claim {CRITIQUE_AUTHOR} misunderstands
2. **subject_source**: Location in {SUBJECT_AUTHOR}'s response
3. **critique_addresses**: The exact quote(s) from {CRITIQUE_AUTHOR}'s critique where they actually address this point
4. **critique_source**: Location in {CRITIQUE_AUTHOR}'s essay
5. **analysis**: Explain how {CRITIQUE_AUTHOR}'s text demonstrates they understood/engaged with this point
6. **avoided_critique**: What substantive critique is {SUBJECT_AUTHOR} avoiding?
7. **severity**: high/medium/low
8. **recommendation**: Draft prose {CRITIQUE_AUTHOR} could use in a rejoinder

Format as valid JSON array.

Begin your analysis:""",

    "contradiction": """You are a forensic analyst examining a scholarly exchange between {SUBJECT_AUTHOR} and {CRITIQUE_AUTHOR}. Your task is to identify instances of SELF-CONTRADICTION - where {SUBJECT_AUTHOR}'s Response claims things that go beyond, contradict, or retroactively reframe what they actually wrote in their original essays.

## CONTEXT

1. **{SUBJECT_AUTHOR}'s Original Essays**: The baseline against which their Response must be measured.
2. **{CRITIQUE_AUTHOR}'s Critique**: A critique based on the original essays.
3. **{SUBJECT_AUTHOR}'s Response**: Where they defend and EXPAND their position.

## YOUR TASK

Find ALL instances where {SUBJECT_AUTHOR}'s RESPONSE:

1. **EXTENSION** - Goes FAR BEYOND the original essays
2. **CONTRADICTION** - Directly contradicts the original essays
3. **REFRAME/RETCON** - Retroactively recasts the original argument

## TEXTUAL GROUNDING

**Source format:**
- `({CRITIQUE_AUTHOR}, Critique)` for {CRITIQUE_AUTHOR}'s essay
- `({SUBJECT_AUTHOR}, Response)` for {SUBJECT_AUTHOR}'s response
- `({SUBJECT_AUTHOR}, Original)` for the original essays

## OUTPUT FORMAT

For EACH contradiction:
1. **benanav_response_claim**: Exact quote from Response
2. **benanav_response_source**: Section in Response
3. **original_essay_text**: What they ACTUALLY wrote
4. **original_essay_source**: Original essay source
5. **contradiction_type**: extension/contradiction/reframe
6. **analysis**: How the Response claim doesn't match original
7. **severity**: high/medium/low
8. **recommendation**: Draft prose for rejoinder

Format as valid JSON array.

Begin your analysis:""",

    "silence": """You are a forensic analyst examining {SUBJECT_AUTHOR}'s response to {CRITIQUE_AUTHOR}'s critique. Your task is to identify UNANSWERED CHALLENGES - {CRITIQUE_AUTHOR}'s specific questions, challenges, or provocations that {SUBJECT_AUTHOR} simply ignores.

## CONTEXT

1. **{CRITIQUE_AUTHOR}'s Critique**: Contains specific questions, challenges, thought experiments, and demands for mechanism/specificity.
2. **{SUBJECT_AUTHOR}'s Response**: Where we check what {SUBJECT_AUTHOR} actually addresses vs. ignores.

## YOUR TASK

Find ALL instances where {CRITIQUE_AUTHOR} poses a direct question, challenge, or demand that {SUBJECT_AUTHOR} fails to address.

## WHAT TO LOOK FOR

1. **Direct questions**: "How would...?", "What happens when...?"
2. **Implicit challenges** that demand response
3. **Thought experiments** requiring engagement
4. **Demands for mechanism**: "how exactly?" or "by what process?"
5. **Specific counterexamples** needing answers

## OUTPUT FORMAT

For EACH unanswered challenge:
1. **critique_challenge**: Exact quote - VERBATIM
2. **critique_source**: Section in {CRITIQUE_AUTHOR}'s essay
3. **challenge_type**: direct_question/implicit_challenge/thought_experiment/demand_for_mechanism
4. **subject_response_gap**: What {SUBJECT_AUTHOR} says instead (or note silence)
5. **why_this_matters**: Why is this silence significant?
6. **severity**: high/medium/low
7. **recommendation**: Draft prose for rejoinder

Format as valid JSON array.

Begin your analysis:""",

    "leap": """You are a forensic analyst examining a scholarly exchange between {SUBJECT_AUTHOR} and {CRITIQUE_AUTHOR}. Your task is to identify LOGICAL LEAPS - instances where {SUBJECT_AUTHOR} attributes arguments or presuppositions to {CRITIQUE_AUTHOR} that don't follow from what {CRITIQUE_AUTHOR} actually wrote.

## YOUR TASK

Find ALL instances where {SUBJECT_AUTHOR} makes:

1. **WRONG CONCLUSION** - Correct reading, incorrect inference
2. **PHANTOM PREMISE** - Invented presupposition

## OUTPUT FORMAT

For EACH logical leap:
1. **subject_claim**: Exact quote about what {CRITIQUE_AUTHOR}'s argument requires/implies
2. **subject_source**: Section in Response
3. **critique_actual_text**: What {CRITIQUE_AUTHOR} actually wrote
4. **critique_source**: Section in {CRITIQUE_AUTHOR}'s essay
5. **leap_type**: wrong_conclusion/phantom_premise
6. **analysis**: The logical gap
7. **what_critique_actually_argues**: {CRITIQUE_AUTHOR}'s actual point
8. **severity**: high/medium/low
9. **recommendation**: Draft prose for rejoinder

Format as valid JSON array.

Begin your analysis:""",

    "concession": """You are a forensic analyst examining {SUBJECT_AUTHOR}'s response to {CRITIQUE_AUTHOR}'s critique. Your task is to identify SILENT CONCESSIONS - places where {SUBJECT_AUTHOR} implicitly agrees with {CRITIQUE_AUTHOR} through changed positions but won't acknowledge it.

## YOUR TASK

Find ALL instances where {SUBJECT_AUTHOR}'s Response shows implicit agreement through:
- New qualifications not in the original essays
- Changed framing that accommodates critique
- Added caveats that weren't there before
- Behavioral shifts

## OUTPUT FORMAT

For EACH silent concession:
1. **critique_quote**: Exact quote of {CRITIQUE_AUTHOR}'s critique
2. **critique_source**: Section in {CRITIQUE_AUTHOR}'s essay
3. **subject_original_position**: What {SUBJECT_AUTHOR} said originally
4. **original_source**: Source document
5. **subject_response_shift**: How Response has shifted
6. **response_source**: Section in Response
7. **what_subject_wont_say**: The explicit acknowledgment avoided
8. **analysis**: Close reading showing the concession
9. **severity**: high/medium/low
10. **recommendation**: Draft prose for rejoinder

Format as valid JSON array.

Begin your analysis:""",

    "retreat": """You are a forensic analyst examining {SUBJECT_AUTHOR}'s response to {CRITIQUE_AUTHOR}'s critique. Your task is to identify RHETORICAL RETREATS - "clarifications" that are actually substantive position changes disguised as mere explanations.

## YOUR TASK

Find ALL instances where {SUBJECT_AUTHOR}'s "clarification" is actually a RETREAT:
- Narrowing the scope of a claim
- Weakening a strong assertion
- Adding escape clauses not in the original
- Redefining terms to be less ambitious

## OUTPUT FORMAT

For EACH rhetorical retreat:
1. **subject_clarification**: Exact quote of the "clarification"
2. **subject_response_source**: Section in Response
3. **original_stronger_claim**: Exact quote from original
4. **original_source**: Source document
5. **retreat_type**: narrowing/weakening/adding_escape_clause/redefining_terms
6. **what_changed**: How the position weakened
7. **disguise_language**: The words used to pretend this isn't a retreat
8. **analysis**: Close reading showing the retreat
9. **severity**: high/medium/low
10. **recommendation**: Draft prose for rejoinder

Format as valid JSON array.

Begin your analysis:""",

    "cherrypick": """You are a forensic analyst examining {SUBJECT_AUTHOR}'s response to {CRITIQUE_AUTHOR}'s critique. Your task is to identify SELECTIVE QUOTATION - where {SUBJECT_AUTHOR} quotes {CRITIQUE_AUTHOR} out of context, truncates quotes, or omits parts that undermine their response.

## YOUR TASK

Find EVERY instance where {SUBJECT_AUTHOR} quotes or characterizes {CRITIQUE_AUTHOR}, then check the FULL CONTEXT for:
- Truncations that change meaning
- Out-of-context quotes
- Selective omission of qualifications
- Mischaracterizations

## OUTPUT FORMAT

For EACH cherry-pick:
1. **subject_uses_quote**: How {SUBJECT_AUTHOR} quotes/characterizes
2. **subject_source**: Section in Response
3. **critique_full_context**: The FULL passage with surrounding context
4. **critique_source**: Section in {CRITIQUE_AUTHOR}'s essay
5. **cherrypick_type**: truncation/out_of_context/selective_omission/mischaracterization
6. **what_subject_omits**: Specific words/sentences left out
7. **how_omission_changes_meaning**: How full context undermines the use
8. **analysis**: Close reading showing selective quotation
9. **severity**: high/medium/low
10. **recommendation**: Draft prose for rejoinder

Format as valid JSON array.

Begin your analysis:""",

    "tuquoque": """You are a forensic analyst examining {SUBJECT_AUTHOR}'s response to {CRITIQUE_AUTHOR}'s critique. Your task is to identify TU QUOQUE FALLACIES - where {SUBJECT_AUTHOR} deflects criticism by claiming {CRITIQUE_AUTHOR} has the same problem.

## KEY INSIGHT

Even if the tu quoque is TRUE, it still doesn't ANSWER {SUBJECT_AUTHOR}'s problem. The critique stands.

## OUTPUT FORMAT

For EACH tu quoque:
1. **morozov_critique**: Exact quote of {CRITIQUE_AUTHOR}'s original critique
2. **morozov_source**: Section in critique
3. **benanav_tu_quoque**: {SUBJECT_AUTHOR}'s exact "you too" response
4. **benanav_source**: Section in Response
5. **is_tu_quoque_accurate**: true or false
6. **why_it_doesnt_answer**: Why it doesn't resolve the problem
7. **what_benanav_should_address**: What would ACTUALLY answer the critique
8. **analysis**: Close reading
9. **severity**: high/medium/low
10. **recommendation**: Draft prose for rejoinder

Format as valid JSON array.

Begin your analysis:""",

    "namedrop": """You are a forensic analyst examining {SUBJECT_AUTHOR}'s response to {CRITIQUE_AUTHOR}'s critique. Your task is to identify AUTHORITY GAPS - where {SUBJECT_AUTHOR} invokes theorists without showing how their work actually supports their specific claims.

## YOUR TASK

Find ALL instances where {SUBJECT_AUTHOR} name-drops theorists without:
- Specific textual support from their works
- Clear mechanism for how their ideas support the claim
- Acknowledgment of how their positions might differ

## OUTPUT FORMAT

For EACH authority gap:
1. **subject_invocation**: How {SUBJECT_AUTHOR} invokes the theorist
2. **subject_source**: Section in Response or original
3. **theorist_invoked**: Name of theorist
4. **claim_being_defended**: What specific claim this supports
5. **gap_type**: no_textual_support/theorist_actually_disagrees/irrelevant_to_claim/oversimplification
6. **what_theorist_actually_argued**: Brief summary (if known)
7. **analysis**: Close reading showing the gap
8. **severity**: high/medium/low
9. **recommendation**: Draft prose for rejoinder

Format as valid JSON array.

Begin your analysis:""",

    "strawman_risk": """You are a pre-publication vulnerability analyst helping {USER_AUTHOR} strengthen his counter-response to {SUBJECT_AUTHOR}. Your task is to identify STRAWMAN RISKS - passages where {USER_AUTHOR} characterizes {SUBJECT_AUTHOR}'s position in ways that {SUBJECT_AUTHOR} could credibly accuse of being misrepresentations.

## YOUR TASK

Find passages in {USER_AUTHOR}'s counter-response where he characterizes {SUBJECT_AUTHOR}'s position, then check against {SUBJECT_AUTHOR}'s ACTUAL texts.

## OUTPUT FORMAT

For EACH strawman risk:
1. **vulnerable_passage**: Exact quote from counter-response
2. **vulnerable_source**: Location
3. **benanav_actual_text**: What {SUBJECT_AUTHOR} ACTUALLY wrote
4. **benanav_source**: Location in {SUBJECT_AUTHOR}'s texts
5. **benanav_attack**: How {SUBJECT_AUTHOR} could frame his counter-attack
6. **strawman_type**: attribution_error/oversimplification/conflation/exaggeration
7. **suggested_revision**: SPECIFIC suggestions for how to rewrite
8. **analysis**: Gap between characterization and actual position
9. **severity**: high/medium/low

Format as valid JSON array.

Begin your analysis:""",

    "inconsistency": """You are a pre-publication vulnerability analyst helping {USER_AUTHOR} strengthen his counter-response. Your task is to identify INTERNAL INCONSISTENCIES - places where {USER_AUTHOR} contradicts himself.

## YOUR TASK

Find passages where {USER_AUTHOR}'s positions conflict:
1. **Within the counter-response**: Says X in one place, ~X in another
2. **Between essays**: First essay says X, counter-response says ~X

## OUTPUT FORMAT

For EACH inconsistency:
1. **passage_one**: First quote - VERBATIM
2. **source_one**: Location
3. **passage_two**: Second (conflicting) quote - VERBATIM
4. **source_two**: Location
5. **inconsistency_type**: direct_contradiction/tension/scope_shift/framework_drift/rhetorical_shift
6. **what_conflicts**: How the passages conflict
7. **benanav_attack**: How {SUBJECT_AUTHOR} could exploit this
8. **suggested_revision**: SPECIFIC reconciliation suggestions
9. **analysis**: Detailed explanation
10. **severity**: high/medium/low

Format as valid JSON array.

Begin your analysis:""",

    "logic_gap": """You are a pre-publication vulnerability analyst helping {USER_AUTHOR} strengthen his counter-response. Your task is to identify LOGIC GAPS - places where {USER_AUTHOR}'s conclusions don't follow from his premises.

## YOUR TASK

Find arguments where:
1. **Non sequitur**: Conclusion doesn't follow from premises
2. **Missing premise**: Argument requires unstated assumption
3. **Inferential leap**: Goes from A to C without establishing B
4. **Overgeneralization**: Specific evidence supports general claim
5. **False dichotomy**: Presents limited options when more exist

## OUTPUT FORMAT

For EACH logic gap:
1. **vulnerable_passage**: The exact argument
2. **vulnerable_source**: Location
3. **premise**: What is established
4. **conclusion**: What is inferred
5. **gap_type**: non_sequitur/missing_premise/inferential_leap/overgeneralization/false_dichotomy
6. **missing_link**: What would need to be true for argument to work
7. **benanav_attack**: How {SUBJECT_AUTHOR} could challenge
8. **suggested_revision**: SPECIFIC fixes
9. **analysis**: Detailed explanation
10. **severity**: high/medium/low

Format as valid JSON array.

Begin your analysis:""",

    "unanswered": """You are a pre-publication vulnerability analyst helping {USER_AUTHOR} strengthen his counter-response. Your task is to identify UNANSWERED POINTS - valid arguments {SUBJECT_AUTHOR} made that {USER_AUTHOR} doesn't address.

## YOUR TASK

Find arguments in {SUBJECT_AUTHOR}'s response that:
1. Are not addressed in {USER_AUTHOR}'s counter-response
2. Are substantive
3. Would look evasive if left unanswered

## OUTPUT FORMAT

For EACH unanswered point:
1. **benanav_point**: The argument - VERBATIM quote
2. **benanav_source**: Location
3. **point_type**: direct_challenge/counterexample/question/alternative_explanation/framework_defense
4. **morozov_response**: complete_silence/deflection/partial_response/dismissal
5. **why_this_matters**: Why leaving this unanswered is a problem
6. **benanav_attack**: How {SUBJECT_AUTHOR} would exploit
7. **suggested_revision**: SPECIFIC suggestions
8. **analysis**: Explanation
9. **severity**: high/medium/low

Format as valid JSON array.

Begin your analysis:""",

    "overconcession": """You are a pre-publication vulnerability analyst helping {USER_AUTHOR} strengthen his counter-response. Your task is to identify OVER-CONCESSIONS - places where {USER_AUTHOR} gives away too much to {SUBJECT_AUTHOR}.

## YOUR TASK

Find passages where {USER_AUTHOR}:
1. **Concedes in ways that undermine his critique**
2. **Grants more than necessary**
3. **Backs away from strong claims**
4. **Provides ammunition** {SUBJECT_AUTHOR} can quote against him

## OUTPUT FORMAT

For EACH over-concession:
1. **concession_passage**: The exact concession
2. **concession_source**: Location
3. **original_position**: What {USER_AUTHOR} argued in first essay
4. **concession_type**: strategic_gift/unnecessary_hedge/silent_retreat/ammunition
5. **what_it_undermines**: How it weakens {USER_AUTHOR}'s position
6. **benanav_attack**: How {SUBJECT_AUTHOR} would use this
7. **suggested_revision**: SPECIFIC fixes
8. **analysis**: Explanation
9. **severity**: high/medium/low

Format as valid JSON array.

Begin your analysis:""",

    "overreach": """You are a pre-publication vulnerability analyst helping {USER_AUTHOR} strengthen his counter-response. Your task is to identify OVERREACH - places where {USER_AUTHOR}'s claims extend beyond what his arguments support.

## YOUR TASK

Find passages where {USER_AUTHOR}:
1. **Overgeneralizes**: Specific case treated as universal
2. **Overclaims certainty**: More certain than justified
3. **Extends scope**: Argument proven for X, applied to Y without warrant
4. **Unsupported necessity**: "must," "inevitably" without justification

## OUTPUT FORMAT

For EACH overreach:
1. **overreach_passage**: The exact claim
2. **overreach_source**: Location
3. **overreach_type**: overgeneralization/unwarranted_certainty/scope_creep/straw_magnification
4. **what_morozov_established**: What the argument actually supports
5. **what_morozov_claims**: What broader claim is made
6. **the_gap**: Distance between supported and claimed
7. **benanav_attack**: How {SUBJECT_AUTHOR} could exploit
8. **suggested_revision**: SPECIFIC fixes
9. **defensible_version**: Rewrite to be bulletproof
10. **severity**: high/medium/low

Format as valid JSON array.

Begin your analysis:""",

    "undercitation": """You are a pre-publication vulnerability analyst helping {USER_AUTHOR} strengthen his counter-response to {SUBJECT_AUTHOR}. Your task is to identify UNDER-CITATION - passages where {USER_AUTHOR} makes claims that lack sufficient textual support.

## YOUR TASK

Find passages where {USER_AUTHOR}:
1. **Makes claims about {SUBJECT_AUTHOR}'s framework without citing evidence**
2. **Attributes implications without textual basis**
3. **Makes sweeping characterizations without quotes**
4. **Draws conclusions {SUBJECT_AUTHOR} could dispute**

## OUTPUT FORMAT

For EACH under-citation:
1. **vulnerable_passage**: Exact quote making unsupported claim
2. **vulnerable_source**: Location
3. **claim_type**: framework_characterization/position_attribution/implication_claim/motivation_attribution/absence_claim
4. **evidence_needed**: What textual evidence would ground this
5. **evidence_exists**: Does such evidence exist? If YES: provide quote. If NO: state so.
6. **benanav_attack**: How {SUBJECT_AUTHOR} would phrase the challenge
7. **suggested_revision**: SPECIFIC fixes with quotes if available
8. **analysis**: Why this passage is vulnerable
9. **severity**: high/medium/low

Format as valid JSON array.

Begin your analysis:""",

    "weak_authority": """You are a pre-publication vulnerability analyst helping {USER_AUTHOR} strengthen his counter-response. Your task is to identify WEAK AUTHORITY APPEALS - places where {USER_AUTHOR} invokes theorists whose positions may not support his claims.

## YOUR TASK

Find passages where {USER_AUTHOR}:
1. **Invokes theorists without textual support**
2. **Overreads theorist positions**
3. **Cherry-picks from complex thinkers**
4. **Name-drops for credibility**
5. **Misrepresents theoretical positions**

## OUTPUT FORMAT

For EACH weak authority:
1. **authority_passage**: {USER_AUTHOR}'s invocation
2. **authority_source**: Location
3. **theorist_invoked**: Who is cited
4. **claim_being_defended**: What point this supports
5. **weakness_type**: unsupported_invocation/overreading/selective_use/credentialing/misreading
6. **vulnerability**: How this could be challenged
7. **benanav_attack**: How {SUBJECT_AUTHOR} could exploit
8. **suggested_revision**: SPECIFIC fixes
9. **analysis**: Explanation
10. **severity**: high/medium/low

Format as valid JSON array.

Begin your analysis:""",

    "exposed_flank": """You are a pre-publication vulnerability analyst helping {USER_AUTHOR} strengthen his counter-response to {SUBJECT_AUTHOR}. Your task is to identify EXPOSED FLANKS - critiques {USER_AUTHOR} makes of {SUBJECT_AUTHOR} that could be turned back on {USER_AUTHOR} himself.

## YOUR TASK

Find passages where {USER_AUTHOR} criticizes {SUBJECT_AUTHOR} for something that:
1. **{USER_AUTHOR} himself does in this very essay**
2. **{USER_AUTHOR} did in his first essay**
3. **Could be applied to {USER_AUTHOR}'s framework/position**
4. **Uses standards {USER_AUTHOR} doesn't meet**

## OUTPUT FORMAT

For EACH exposed flank:
1. **vulnerable_passage**: Exact quote criticizing {SUBJECT_AUTHOR}
2. **vulnerable_source**: Location
3. **critique_type**: methodological/substantive/structural/stylistic/standard_invocation
4. **morozov_exposure**: Where {USER_AUTHOR} is vulnerable to the same critique
5. **exposure_source**: Location
6. **benanav_attack**: How {SUBJECT_AUTHOR} would phrase the tu quoque
7. **flank_type**: same_text_hypocrisy/cross_text_hypocrisy/structural_symmetry/unmet_standard
8. **suggested_revision**: SPECIFIC defense suggestions
9. **analysis**: Explanation
10. **severity**: high/medium/low

Format as valid JSON array.

Begin your analysis:""",
}


# ============================================================================
# Default Output Schema
# ============================================================================

DEFAULT_OUTPUT_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "analysis": {"type": "string"},
            "severity": {"type": "string", "enum": ["high", "medium", "low"]},
            "recommendation": {"type": "string"},
        },
        "required": ["analysis", "severity"],
    },
}


# ============================================================================
# Seed Function
# ============================================================================

async def seed_rhetoric():
    """Seed the rhetoric analyzers into the database."""
    print("Seeding rhetoric analyzers...")
    print("-" * 60)

    async with async_session() as session:
        for analyzer_def in RHETORIC_ANALYZERS:
            key = analyzer_def["rhetoric_key"]
            print(f"  Processing: {key}")

            # Check if already exists
            result = await session.execute(
                select(Rhetoric).where(Rhetoric.rhetoric_key == key)
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"    Skipping (already exists)")
                continue

            # Get prompt template
            prompt = PROMPTS.get(key, "")
            if not prompt:
                print(f"    WARNING: No prompt found for {key}")
                continue

            # Create the rhetoric analyzer
            rhetoric = Rhetoric(
                rhetoric_key=key,
                name=analyzer_def["name"],
                description=analyzer_def["description"],
                category=analyzer_def["category"],
                prompt_template=prompt,
                output_schema=DEFAULT_OUTPUT_SCHEMA,
                requires_subject=analyzer_def.get("requires_subject", False),
                requires_critique=analyzer_def.get("requires_critique", False),
                requires_response=analyzer_def.get("requires_response", False),
                requires_counter_response=analyzer_def.get("requires_counter_response", False),
                model="claude-opus-4-5-20251101",
                thinking_budget=32000,
                max_tokens=64000,
                version=1,
                status="active",
            )
            session.add(rhetoric)
            await session.flush()

            # Create initial version
            version = RhetoricVersion(
                rhetoric_id=rhetoric.id,
                version=1,
                full_snapshot=rhetoric.to_dict(),
                change_summary="Initial seed from the-critic",
            )
            session.add(version)
            print(f"    Seeded: {analyzer_def['name']}")

        await session.commit()
        print("-" * 60)
        print("Done! Seeded rhetoric analyzers.")


if __name__ == "__main__":
    asyncio.run(seed_rhetoric())
