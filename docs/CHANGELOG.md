# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **The Master · Method Registry** (2026-09-04) — the console becomes the face of the estate's one registry of methods.
  - **Map** (`/`, [frontend/src/pages/index.tsx](frontend/src/pages/index.tsx)) — dark hero with the 10 July 2026 doctrine quote; live counts strip (engines by family, processes, chains, paradigms, audiences, stances, organs, presentation grammar with tooltip); organs by layer Sources → Search → Reasoning → Composition → Creative → Consumers with Governance as the base band (solid = native, outlined = mirrored, dashed = planned; status pills; non-blocking reachability dots via `mode:'no-cors'` probes); "How a dossier is made" rail of the 11 `dossier_standard` phases with links to a real run and its plates; cross-organ processes.
  - **Organs** (`/organs`, `/organs/[key]`, [frontend/src/pages/organs/](frontend/src/pages/organs/)) — cards by layer; detail with role, contributions, families, counts, depends-on/feeds, engines hosted here, processes, lineage.
  - **Processes** (`/processes`, `/processes/[key]`, [frontend/src/pages/processes/](frontend/src/pages/processes/)) — workflows grouped by organ with phase rails; detail as a vertical numbered spine with engine/chain/function links and `#phase-N` anchors.
  - Shared estate components in [frontend/src/components/estate/](frontend/src/components/estate/) (`OrganCard`, `EstateMap`, `PhaseRail`/`ProcessCard`, `ProcessSpine`, `useReachable`) and vocabulary in [frontend/src/lib/families.ts](frontend/src/lib/families.ts).
  - API client: `api.organs.{list, byLayer, get, engines}`, `api.registry.{count, counts}`, `api.workflows.listDetailed`, `api.engines.getDoctrine` ([frontend/src/lib/api.ts](frontend/src/lib/api.ts)); types `EngineFamily`, `EngineSyncMode`, `EngineRegistryStatus`, `Organ*`, `EngineDoctrine`.
  - **Engines index** — family strip with counts (client-side filter on `family`), `?family=`/`?organ=` deep links, 11 new categories (storytelling, editing, restructuring, search, visual, audio, planning, quality, composition, imagination, governance) in browse mode, "Organ · sync" badge on rows whose home organ is not The Analyst.
  - **Engine detail** — banner for mirrored/planned methods with `lineage_refs` and "Open in {organ}"; Doctrine section from `/v1/engines/{key}/doctrine` (per-file header with chars and sha256 prefix, collapsed preformatted text); empty states for Lineage/Depth/Dimensions/Capabilities/Composability/Schema; Prompt Preview shows "No composed prompt: the doctrine is in the home organ" on 404.
  - Verification screenshots (local, untracked) in `.playwright-mcp/master-{map,organs,organ-wirecut,processes,process-wirecut,engines-families,engine-wirecut-spine,engine-argument-architecture}.png`.

### Changed
- Layout wordmark is now "The Master" with the "Method Registry" kicker; document title "The Master"; new ESTATE sidebar group (Map, Organs, Processes) ahead of Story and Definitions. Story and Definitions unchanged.
- `api.engines.list/get` keep the registry lifecycle under `registry_status` (the console's `EngineStatus` is untouched).
- `WorkflowCategory` accepts `process` and `rendering`; `EngineCategory` accepts the 11 estate categories.

---

## [2026-09-03]

### Added
- **The Analyst · Console** (branch `feat/the-analyst-console`, 2026-09-03) — see `communications/CHANGES_the_analyst_console.md`.
  - **Runs** list (`/jobs`, [frontend/src/pages/jobs/index.tsx](frontend/src/pages/jobs/index.tsx)) — executor jobs + dossier jobs (404-tolerant), status/plan/steps/created/tokens/cost, links to console and inspector; "Runs" added to the sidebar Story group.
  - **Run Console** (`/jobs/{id}/console`, [frontend/src/pages/jobs/[id]/console.tsx](frontend/src/pages/jobs/[id]/console.tsx)) — strategy strip with alternatives considered, phase tree with live pips (lifted from the-critic `PipelineVisualization`), prompt | output per node with model/tokens/cost/duration, kind-coloured timeline, executive view toggle, cost meter. Components in `frontend/src/components/console/`, events feed hook in [frontend/src/lib/events.ts](frontend/src/lib/events.ts) (SSE → polling → 404 degrade), dev fixture `frontend/src/fixtures/events-sample.json` (`?fixture=1&replay=1`).
  - **Settings** page (`/settings`) showing backend URLs and health probes (fixes the 404 sidebar link).
  - `frontend/src/lib/config.ts` — single exported `ANALYZER_V2_URL` / `API_BASE`; `frontend/.env.example`; repo-root `render.yaml` for both services.
  - Types `RunEvent`, `RunEventsSummary`, `JobResultsResponse`, `PhaseOutputsResponse`, `Pipeline*Viz`, `DossierJobSummary`; API `executorJobs.results/phaseOutputs`, `plans.get/pipelineVisualization`, `runEvents.*`, `dossierJobs.list`, `HttpError`.
  - Editorial design tokens (`ink`, `paper`, `gold`, `font-display`) in `tailwind.config.js` / `globals.css`, applied to Layout, Runs and Console only.
  - Cherry-picked recovery commit c365b2c: Plans → Jobs tab, `annotated_prose` sub-renderer option/default, ui-docs.

### Changed
- Default analyzer-v2 target is now The Analyst (`https://the-analyst-kcuc.onrender.com`); the five page-level `ANALYZER_V2_URL` copies (objectives/*, plans/*) import from `lib/config`.
- Layout brand renamed to "The Analyst · Console"; sidebar grouped (Story / Definitions), dark editorial styling.
- Plans → Jobs tab links to the run console; jobs inspector header links to the run console.

### Fixed
- "Failed to load engines" on the live console — dead default host baked into the bundle (`api.ts`), env var never set on Render.
- Plans → Jobs tab listed every job: `GET /v1/executor/jobs` ignores `plan_id`; now filtered client-side.
- Sidebar Settings link 404.

### Fixed
- **Section renderer dropdown** — Dropdown for selecting sub-renderer type now reads from the renderer definition's `available_section_renderers` instead of a hardcoded list. New sub-renderers (e.g., evidence_trail) appear automatically when added to the accordion definition. Fallback to hardcoded list when definition not loaded.
  ([frontend/src/pages/views/[key].tsx](frontend/src/pages/views/[key].tsx))

### Added
- **Implementations page** — pipeline orchestration view showing how workflows wire engines and chains together:
  - **List page** (`/implementations`) groups workflows by source project (Critic, Decider V2, etc.) with pass/chain/engine counts
  - **Detail page** (`/implementations/{key}`) shows full pipeline flow with:
    - Pass-by-pass vertical flow with chains expanded to show constituent engines
    - Depth toggle (surface/standard/deep) changes stance sequences displayed per engine
    - Engine cards with expandable detail: problematique, dimensions, capabilities, stance badges
    - Data flow summary showing context parameter mappings between passes
    - Cross-links to engine detail and operationalization pages
  - **New types**: `EngineChainSpec`, `ChainSummary`, `ChainBlendMode`
  - **Updated types**: `WorkflowPass` now includes `chain_key` and `context_parameters`
  - **New API**: `api.chains.list()` and `api.chains.get()` via direct fetch to ANALYZER_V2_URL
  - **Nav**: "Implementations" item added to sidebar after Workflows
- **Enriched Lineage tab** — redesigned with rich content (bios, descriptions, definitions) for all 11 engines:
  - Dark hero section for primary thinker with serif name + 2-3 sentence bio paragraph
  - 2-column card grid for secondary thinkers with descriptions and left border accent
  - 2-column tradition cards with small-caps headers and serif description paragraphs
  - 2-column key concept glossary cards with amber left border, serif concept names, and definitions
  - TypeScript interfaces: `ThinkerReference`, `TraditionEntry`, `KeyConceptEntry`
  - Union types on `IntellectualLineage` for backwards compatibility with flat strings
  - Normalizer handles both string and rich object data at render time
- **History tab for capability engines** — shows auto-detected YAML definition changes from analyzer-v2:
  - Baseline entries with Baseline badge + timestamp
  - Expandable change entries with field-level diffs grouped by section
  - Color-coded actions: green=added, amber=modified, rose=removed
  - Lazy-loaded query (only fetches when History tab active)
  - Legacy engines retain their own Version History tab (guarded with `!capabilityDef`)
  - `getCapabilityHistory` API client using direct `fetch(ANALYZER_V2_URL + ...)` pattern
  - TypeScript types: `CapabilityFieldChange`, `CapabilityHistoryEntry`, `CapabilityHistoryResponse`
- **Tab disaggregation for capability engines** — replaced single monolithic "Capability" tab with 7 focused sub-tabs:
  - **About**: Full-width Problematique prose (lineage moved to Lineage tab)
  - **Lineage**: Intellectual lineage with primary thinker hero, secondary cards, traditions, key concepts
  - **Depth**: Depth levels (surface/standard/deep) with pass structures and stance flows
  - **Dimensions**: Pipeline matrix + dimension cards with probing questions
  - **Capabilities**: Enriched capability cards with thinker badges, grounding, indicators, depth scaling
  - **Composability**: 3-column grid (shares_with, consumes_from, synergy engines)
  - **History**: Capability definition change tracking from analyzer-v2
  - Legacy engines (185) retain original tabs: About (Engine Profile), Stage Context, Prompt Preview, Schema, Consumers, History
  - Tab selection driven by `capabilityDef` query result — no capability definition = legacy tabs
  - Removed deprecated composed prompt preview (replaced by multi-pass operationalization layer)
  - Cleaned up unused `capabilityDepth` state, `capabilityPrompt` query, and `Eye` import
- **Dimension × Pass Pipeline Matrix** on engine detail Capability tab — visual grid showing which analytical dimensions each pass targets at each depth level
  - Rows = dimensions, columns = passes with colored dots per stance
  - Depth toggle buttons (surface/standard/deep) recalculate the matrix
  - Coverage ratios per dimension (e.g., 3/4 passes cover it)
  - Stance legend with color-coded labels
  - Enhanced `DimensionCard` with pass coverage indicators in collapsed headers and pass badges (P1, P2) with stance labels in expanded "By Depth" section
  - Shared `STANCE_STYLES` constant and `getStanceStyle()` helper replacing inline 7-way conditionals
  - `buildDimensionPassMap()` helper pre-computes dimension → pass relationships from `capabilityDef.depth_levels[].passes[].focus_dimensions`
- **Compact stance flow** in Analysis Depth section — replaced detailed pass cards with a concise horizontal flow showing pass numbers, stance badges, and focus dimension counts
- **Operationalizations management UI** — full coverage grid list page and engine detail pages
  - Coverage grid showing stance × engine operationalization status
  - Per-engine detail with stance cards and depth sequence viewer
  - Interactive depth sequence editor with drag-and-drop pass reordering, automatic renumbering, consumes_from rewiring
  - Add pass (+) with stance picker dropdown, remove pass (x) on hover
  - Save/reset with dirty tracking and unsaved-changes banner
  - Per-stance Generate button (LLM regeneration) and Compose Preview button
  - Navigation item in sidebar
- **Stances section** in sidebar — list and detail pages for analytical stances
- **Teal color** for dialectical stance across all badge/accent maps
- **Capability Definition tab** on engine detail page — view v2 prose-mode capability definitions
  - Displays problematique, intellectual lineage, analytical dimensions, capabilities, composability, depth levels
  - Collapsible dimension cards with probing questions and per-depth guidance
  - Capability prompt preview with depth selector (surface/standard/deep)
  - Synergy engine links navigate to other engine detail pages
  - Tab only appears for engines that have a capability definition in analyzer-v2
  - TypeScript types: `CapabilityEngineDefinition`, `AnalyticalDimension`, `EngineCapabilityItem`, `ComposabilitySpec`, `DepthLevel`, `IntellectualLineage`
  - API client methods: `getCapabilityDefinition()`, `getCapabilityPrompt()` (fetches from analyzer-v2 directly)
- **Capability-enabled filter** on engines list page — checkbox to show only engines with capability definitions
  - Badge shows count of matching engines in current list
  - `listCapabilityKeys()` API method fetches from analyzer-v2 directly
  - Filter intersects with existing app/search filters

### Fixed
- SQLite startup migration crash — `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` not supported in SQLite; replaced with try/except pattern ([api/main.py](api/main.py))
- Paradigm branch generation stuck at 6% - "Start Generation" button was hidden because `guiding_thinkers` pre-populated during branch creation made `completed > 0`, failing the `completed === 0` check. Button now shows whenever generation isn't complete, with "Resume" label for partial progress.
- Generation endpoint timeout on Render - converted from synchronous HTTP request (18 sequential LLM calls blocking) to `BackgroundTasks` with its own DB session. Returns immediately, frontend polls for progress.
- Switched `call_llm` from sync `Anthropic` to `AsyncAnthropic` client to avoid blocking the event loop
- Updated LLM model from `claude-sonnet-4-20250514` to `claude-sonnet-4-5-20250929`
- Added resume support to generation - skips already-populated fields so retries don't regenerate completed work
- Added structured logging throughout branch generation process (`[BranchGen]` prefix)

### Added
- **Functions Browsing UI** - Browse decider-v2 LLM function definitions
  - List page at `/functions` with card grid, search, category/tier/project filters
  - Detail page at `/functions/[key]` with 3 tabs: Overview, Prompts, Implementations
  - Color-coded badges for category (6 colors), tier (3 colors), track (3 colors)
  - Prompts tab: expandable accordion with dark code viewer, copy button, variable badges
  - Implementations tab: GitHub source links with line numbers, grouped by project
  - Functions API namespace in `frontend/src/lib/api.ts` (fetches from analyzer-v2 directly)
  - TypeScript types for all function-related entities
  - Zap icon navigation link in sidebar

- Rhetoric Analyzers management feature
  - Backend model for rhetoric analyzers with version tracking ([api/models/rhetoric.py](api/models/rhetoric.py))
  - 18 rhetoric analyzers: 9 Round 1 (Rhetoric) and 9 Round 2 (Vulnerability)
  - Full CRUD API routes at /api/rhetoric ([api/routes/rhetoric.py](api/routes/rhetoric.py))
  - Prompt template rendering with author context parameters
  - Seed script for initial rhetoric data ([scripts/seed_rhetoric.py](scripts/seed_rhetoric.py))
  - Sanitization script to remove all hardcoded author references ([scripts/sanitize_rhetoric_prompts.py](scripts/sanitize_rhetoric_prompts.py))
  - All prompts use generic placeholders: {SUBJECT_AUTHOR}, {CRITIQUE_AUTHOR}, {RESPONSE_AUTHOR}, {USER_AUTHOR}
  - Output schema population script with proper JSON schemas for all 18 analyzers ([scripts/populate_rhetoric_schemas.py](scripts/populate_rhetoric_schemas.py))
  - Frontend types: RhetoricCategory, Rhetoric, RhetoricSummary, RhetoricVersion, RhetoricUpdate ([frontend/src/types/index.ts](frontend/src/types/index.ts))
  - Frontend API client with rhetoric namespace ([frontend/src/lib/api.ts](frontend/src/lib/api.ts))
  - Rhetoric list page with Round 1/Round 2 category tabs ([frontend/src/pages/rhetoric/index.tsx](frontend/src/pages/rhetoric/index.tsx))
  - Rhetoric detail page with prompt editor, preview, schema viewer, version history ([frontend/src/pages/rhetoric/[key].tsx](frontend/src/pages/rhetoric/[key].tsx))
  - Rhetoric navigation in sidebar ([frontend/src/components/Layout.tsx](frontend/src/components/Layout.tsx))
- Engine Profile / About feature for engines
  - EngineProfile TypeScript types in ([frontend/src/types/index.ts](frontend/src/types/index.ts))
  - Profile API endpoints in ([frontend/src/lib/api.ts](frontend/src/lib/api.ts)) - getProfile, saveProfile, deleteProfile
  - LLM endpoints for AI profile generation - generateProfile, profileSuggestions
  - EngineProfileEditor component ([frontend/src/components/EngineProfileEditor.tsx](frontend/src/components/EngineProfileEditor.tsx))
  - Backend profile endpoints: GET/PUT/DELETE /api/engines/{key}/profile ([api/routes/engines.py](api/routes/engines.py))
  - Backend LLM profile generation: POST /api/llm/profile-generate, POST /api/llm/profile-suggestions ([api/routes/llm.py](api/routes/llm.py))
  - GET /api/llm/status endpoint to check LLM availability ([api/routes/llm.py](api/routes/llm.py))
  - engine_profile JSON column on Engine model ([api/models/engine.py](api/models/engine.py))
  - Database migration for engine_profile column ([db/migrations/versions/003_add_engine_profile.py](db/migrations/versions/003_add_engine_profile.py))
  - About tab on engine detail page as first tab ([frontend/src/pages/engines/[key].tsx](frontend/src/pages/engines/[key].tsx))
  - Collapsible sections for theoretical foundations, key thinkers, methodology, extracts, use cases, strengths, limitations, related engines, preamble
  - "Generate Profile with AI" button using Claude API via analyzer-v2 backend
- Stage context prompt composition system ([api/stages/](api/stages/))
  - Jinja2 templates for extraction, curation, concretization prompts
  - Framework primers (brandomian, dennett, toulmin)
  - Runtime prompt composition from stage_context + templates
- StageContextEditor component for editing stage_context ([frontend/src/components/StageContextEditor.tsx](frontend/src/components/StageContextEditor.tsx))
- GET /engines/{key}/stage-context endpoint ([api/routes/engines.py](api/routes/engines.py))
- GET /engines/{key}/concretization-prompt endpoint ([api/routes/engines.py](api/routes/engines.py))
- Audience parameter on prompt endpoints (?audience=researcher|analyst|executive|activist)
- POST /llm/stage-context-improve endpoint for AI-assisted stage context editing ([api/routes/llm.py](api/routes/llm.py))
- Migration script to convert engines to stage_context format ([scripts/migrate_engines_to_stage_context.py](scripts/migrate_engines_to_stage_context.py))
- Alembic migration for stage_context column ([db/migrations/versions/001_add_stage_context.py](db/migrations/versions/001_add_stage_context.py))
- StageContext, EngineUpdate TypeScript types ([frontend/src/types/index.ts](frontend/src/types/index.ts))
- Paradigm branching feature - create derivative paradigms from existing ones ([api/routes/paradigms.py](api/routes/paradigms.py), [api/routes/llm.py](api/routes/llm.py))
- LLM-powered sequential content generation for branched paradigms (18 fields)
- Branching fields on Paradigm model: parent_paradigm_key, branch_metadata, branch_depth, generation_status ([api/models/paradigm.py](api/models/paradigm.py))
- POST /paradigms/{key}/branch endpoint for branch creation
- GET /paradigms/{key}/lineage endpoint for ancestry chain
- GET /paradigms/{key}/branches endpoint for child paradigms
- POST /llm/generate-branch/{key} endpoint for triggering content generation
- GET /llm/branch-progress/{key} endpoint for generation progress
- Filtering params on paradigms list (parent_key, is_root, generation_status)
- BranchParadigmModal component for branch configuration ([frontend/src/components/paradigms/BranchParadigmModal.tsx](frontend/src/components/paradigms/BranchParadigmModal.tsx))
- BranchGenerationProgress component for progress display ([frontend/src/components/paradigms/BranchGenerationProgress.tsx](frontend/src/components/paradigms/BranchGenerationProgress.tsx))
- ParadigmLineage component for ancestry/branches display ([frontend/src/components/paradigms/ParadigmLineage.tsx](frontend/src/components/paradigms/ParadigmLineage.tsx))
- Branch indicators on paradigm list page with filter tabs
- "Create Branch" button on paradigm detail page
- TypeScript types for branching (BranchMetadata, BranchRequest, BranchResponse, BranchProgressResponse, LineageItem)
- Initial project setup with FastAPI backend and Next.js frontend
- Structured LLM suggestion display with edit-before-accept capability ([api/routes/llm.py](api/routes/llm.py), [frontend/src/components/SuggestionPanel.tsx](frontend/src/components/SuggestionPanel.tsx))
- SuggestionCard component with collapsible cards, edit-in-place, confidence indicators ([frontend/src/components/SuggestionCard.tsx](frontend/src/components/SuggestionCard.tsx))
- SuggestionPanel component with Accept All / Clear All bulk actions ([frontend/src/components/SuggestionPanel.tsx](frontend/src/components/SuggestionPanel.tsx))
- JSON parsing helper for robust LLM response handling ([api/routes/llm.py](api/routes/llm.py))
- StructuredSuggestion and SuggestionResponse TypeScript types ([frontend/src/types/index.ts](frontend/src/types/index.ts))

### Changed
- Engine model now supports stage_context JSON column for prompt composition ([api/models/engine.py](api/models/engine.py))
- Prompt columns (extraction_prompt, curation_prompt, concretization_prompt) now nullable for backwards compatibility
- Engine detail page now shows StageContextEditor for engines with stage_context ([frontend/src/pages/engines/[key].tsx](frontend/src/pages/engines/[key].tsx))
- Prompt endpoints now compose prompts at runtime when stage_context present
- TypeScript target updated to ES2018 for regex dotAll flag support ([frontend/tsconfig.json](frontend/tsconfig.json))
- Updated SQLAlchemy models to use database-agnostic types (JSON instead of JSONB, String instead of UUID) for SQLite compatibility
- Engine management API with full CRUD, versioning, and prompt editing ([api/routes/engines.py](api/routes/engines.py))
- Paradigm management API with 4-layer ontology support ([api/routes/paradigms.py](api/routes/paradigms.py))
- Pipeline management API with stage composition ([api/routes/pipelines.py](api/routes/pipelines.py))
- Consumer registry for tracking service dependencies ([api/routes/consumers.py](api/routes/consumers.py))
- Change tracking and propagation system ([api/routes/changes.py](api/routes/changes.py))
- LLM integration for AI-powered suggestions ([api/routes/llm.py](api/routes/llm.py))
- SQLAlchemy models with PostgreSQL support via asyncpg
- Alembic migration infrastructure ([db/migrations/](db/migrations/))
- Next.js frontend with Tailwind CSS styling
- Engine list page with category filtering and search ([frontend/src/pages/engines/](frontend/src/pages/engines/))
- Engine detail page with Monaco editor for prompt editing
- Paradigm list page ([frontend/src/pages/paradigms/](frontend/src/pages/paradigms/))
- Paradigm 4-layer visual editor
- Dashboard with stats and recent changes ([frontend/src/pages/index.tsx](frontend/src/pages/index.tsx))
- TypeScript types for all entities ([frontend/src/types/index.ts](frontend/src/types/index.ts))
- Type-safe API client ([frontend/src/lib/api.ts](frontend/src/lib/api.ts))
- Data migration script from analyzer-v2 JSON files ([scripts/migrate_json_to_postgres.py](scripts/migrate_json_to_postgres.py))
- Project documentation (CLAUDE.md, FEATURES.md, CHANGELOG.md)

---

## [2026-01-28] - Initial Release

### Added
- Complete project scaffold for Analyzer Management Console
- Backend: FastAPI with SQLAlchemy async ORM
- Frontend: Next.js 14 with React Query and Tailwind CSS
- Database: PostgreSQL with full versioning support
- LLM: Anthropic Claude integration for AI assistance
