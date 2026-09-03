# Feature Inventory

> Auto-maintained by Claude Code. Last updated: 2026-09-04


## The Master (Estate)

### Estate navigation and wordmark
- **Status**: Active
- **Description**: Console rebranded "The Master · Method Registry"; document title; sidebar group ESTATE (Map, Organs, Processes) ahead of Story and Definitions
- **Entry Points**:
  - `frontend/src/components/Layout.tsx:58` - ESTATE nav group
  - `frontend/src/components/Layout.tsx:124` - wordmark + kicker
  - `frontend/src/components/Layout.tsx:157` - document title
- **Dependencies**: lucide-react
- **Added**: 2026-09-04

### Estate Map (`/`)
- **Status**: Active
- **Description**: Landing page for the estate: dark hero with the 10 July 2026 doctrine quote, live counts strip from the registry (engines by family, processes, chains, paradigms, audiences, stances, organs, presentation grammar), organs by layer with sync/status treatment and reachability dots, the 11-phase dossier rail with links to a real run and its plates, and the cross-organ processes
- **Entry Points**:
  - `frontend/src/pages/index.tsx:73-254` - MapPage (hero `:108`, counts `:125`, map `:154`, dossier rail `:182`, processes `:226`)
  - `frontend/src/components/estate/EstateMap.tsx:21-89` - layer bands (Sources → Search → Reasoning → Composition → Creative → Consumers, Governance base) + caption
  - `frontend/src/components/estate/OrganCard.tsx:67-130` - organ card (status pill, sync surface, family chips, counts, Open/API/Repo, reachability dot)
  - `frontend/src/components/estate/useReachable.ts:13-47` - no-cors probe with 6 s timeout (health → api → ui)
  - `frontend/src/components/estate/PhaseRail.tsx:7-98` - PhaseRail, ProcessCard, workflowOrganKey (legacy source_project aliases)
  - `frontend/src/lib/families.ts:14-102` - family/layer/status/sync vocabulary and colours
  - `frontend/src/lib/api.ts:790` - api.registry.count/counts (list-endpoint counters)
- **Dependencies**: registry `/v1/organs`, `/v1/engines`, `/v1/workflows`, `/v1/workflows/dossier_standard`, count endpoints
- **Added**: 2026-09-04

### Organs pages (`/organs`, `/organs/[key]`)
- **Status**: Active
- **Description**: Organs by layer (same card as the map) and organ detail: header with status/sync/workspace/links, role, contributions, families, counts, depends-on/feeds links, engines hosted here, processes run here, lineage paths
- **Entry Points**:
  - `frontend/src/pages/organs/index.tsx:6-44` - OrgansPage
  - `frontend/src/pages/organs/[key].tsx:65-335` - OrganDetailPage (engines `:252`, processes `:300`, lineage `:320`)
  - `frontend/src/lib/api.ts:756` - api.organs.list/byLayer/get/engines
  - `frontend/src/types/index.ts:90` - OrganSummary / Organ types
- **Dependencies**: registry `/v1/organs`, `/v1/organs/{key}`, `/v1/organs/{key}/engines`, `/v1/workflows/*`
- **Added**: 2026-09-04

### Processes pages (`/processes`, `/processes/[key]`)
- **Status**: Active
- **Description**: All workflows grouped by the organ that runs them (phase rails on each card) and a process detail with the phases as a vertical numbered spine (engine/chain/function references, dependency anchors `#phase-N`)
- **Entry Points**:
  - `frontend/src/pages/processes/index.tsx:9-88` - ProcessesPage
  - `frontend/src/pages/processes/[key].tsx:10-135` - ProcessDetailPage
  - `frontend/src/components/estate/ProcessSpine.tsx:6-67` - ProcessSpine
  - `frontend/src/lib/api.ts:561` - api.workflows.listDetailed (summaries lack phases/source_project)
- **Dependencies**: registry `/v1/workflows`, `/v1/workflows/{key}`
- **Added**: 2026-09-04

### Engines index: family strip and estate categories
- **Status**: Active
- **Description**: Family chips with counts filter engines client-side; `?family=` / `?organ=` deep links; 11 estate categories in browse mode; "Organ · sync" badge on engines whose home is another organ
- **Entry Points**:
  - `frontend/src/pages/engines/index.tsx:119` - estate CATEGORY_META entries
  - `frontend/src/pages/engines/index.tsx:231` - OrganBadge
  - `frontend/src/pages/engines/index.tsx:429` - family/organ filtering
  - `frontend/src/pages/engines/index.tsx:514` - family strip UI
  - `frontend/src/types/index.ts:46` - EngineFamily / EngineSyncMode / EngineRegistryStatus
- **Dependencies**: registry `/v1/engines` (family, home_organ, sync), `/v1/organs`
- **Added**: 2026-09-04

### Engine detail: mirrored-method banner and Doctrine
- **Status**: Active
- **Description**: For engines with sync mirrored|planned: banner naming the home organ with lineage_refs and "Open in {organ}"; Doctrine section listing mirrored doctrine files (name, chars, sha256 prefix, collapsible preformatted text); graceful empty states for Lineage/Depth/Dimensions/Capabilities/Composability/Schema; Prompt Preview 404 fallback
- **Entry Points**:
  - `frontend/src/pages/engines/[key].tsx:731` - DoctrineFileBlock
  - `frontend/src/pages/engines/[key].tsx:765` - MirroredEmptyState
  - `frontend/src/pages/engines/[key].tsx:911` - organ + doctrine queries
  - `frontend/src/pages/engines/[key].tsx:1062` - banner + Doctrine section
  - `frontend/src/pages/engines/[key].tsx:1792` - schema empty state
  - `frontend/src/lib/api.ts:354` - api.engines.getDoctrine
  - `frontend/src/types/index.ts:112` - EngineDoctrine / DoctrineFile
- **Dependencies**: registry `/v1/engines/{key}` (sync, home_organ, runs_at, lineage_refs), `/v1/engines/{key}/doctrine`
- **Added**: 2026-09-04

## Backend API

### Engine Management
- **Status**: Active
- **Description**: CRUD operations for analytical engine definitions with versioning and stage_context support
- **Entry Points**:
  - `api/routes/engines.py:1-560` - All engine API endpoints including stage-context and prompt composition
  - `api/models/engine.py:1-150` - Engine and EngineVersion models with stage_context column
- **Dependencies**: FastAPI, SQLAlchemy, PostgreSQL
- **Added**: 2026-01-28 | **Modified**: 2026-01-29

### Stage Context Prompt Composition
- **Status**: Active
- **Description**: Runtime prompt composition from stage_context + Jinja2 templates + framework primers
- **Entry Points**:
  - `api/stages/__init__.py:1-25` - Module exports
  - `api/stages/schemas.py:1-200` - StageContext, ExtractionContext, CurationContext Pydantic models
  - `api/stages/registry.py:1-150` - StageRegistry loads templates and frameworks from disk
  - `api/stages/composer.py:1-350` - StageComposer renders Jinja2 templates with context
  - `api/stages/templates/extraction.md.j2` - Extraction prompt template
  - `api/stages/templates/curation.md.j2` - Curation prompt template
  - `api/stages/templates/concretization.md.j2` - Concretization prompt template
  - `api/stages/frameworks/brandomian.json` - Brandomian framework primer
  - `api/stages/frameworks/dennett.json` - Dennett framework primer
  - `api/stages/frameworks/toulmin.json` - Toulmin framework primer
- **Dependencies**: Jinja2, Pydantic
- **Added**: 2026-01-29

### StageContextEditor Component
- **Status**: Active
- **Description**: React component for editing engine stage_context with collapsible sections
- **Entry Points**:
  - `frontend/src/components/StageContextEditor.tsx:1-450` - Full editor component
  - `frontend/src/pages/engines/[key].tsx:200-350` - Integration in engine detail page
- **Dependencies**: React, Lucide icons
- **Added**: 2026-01-29

### Engine Profile / About Feature
- **Status**: Active
- **Description**: Rich metadata for engines including theoretical foundations, key thinkers, methodology, use cases, and AI-powered profile generation
- **Entry Points**:
  - `frontend/src/types/index.ts:87-139` - EngineProfile and nested TypeScript types
  - `frontend/src/lib/api.ts:110-135` - Profile API endpoints (getProfile, saveProfile, deleteProfile)
  - `frontend/src/lib/api.ts:320-340` - LLM endpoints (generateProfile, profileSuggestions)
  - `frontend/src/components/EngineProfileEditor.tsx:1-530` - Full profile editor component
  - `frontend/src/pages/engines/[key].tsx:140-180` - Profile state and queries
  - `frontend/src/pages/engines/[key].tsx:400-460` - About tab content
- **Dependencies**: React, TanStack Query, analyzer-v2 backend (profile & LLM endpoints)
- **Added**: 2026-01-30

### Rhetoric Analyzers Management
- **Status**: Active
- **Description**: CRUD operations for 18 rhetoric analyzers from the-critic with version tracking, prompt editing, and generic author placeholders
- **Entry Points**:
  - `api/models/rhetoric.py:1-70` - Rhetoric and RhetoricVersion models
  - `api/routes/rhetoric.py:1-240` - Full CRUD API with prompt rendering and /seed endpoint
  - `scripts/seed_rhetoric.py:1-750` - Seed script with all 18 prompts
  - `scripts/sanitize_rhetoric_prompts.py:1-336` - Removes hardcoded author names, converts to generic placeholders
  - `scripts/populate_rhetoric_schemas.py:1-382` - Populates JSON output schemas for all 18 analyzers
  - `frontend/src/types/index.ts:350-380` - RhetoricCategory, Rhetoric, RhetoricSummary, RhetoricVersion, RhetoricUpdate types
  - `frontend/src/lib/api.ts:400-480` - Rhetoric API client namespace
  - `frontend/src/pages/rhetoric/index.tsx:1-214` - List page with Round 1/Round 2 tabs
  - `frontend/src/pages/rhetoric/[key].tsx:1-400` - Detail page with prompt editor, preview, schema, history
  - `frontend/src/components/Layout.tsx:28` - Rhetoric navigation link
- **Placeholders**: `{SUBJECT_AUTHOR}`, `{CRITIQUE_AUTHOR}`, `{RESPONSE_AUTHOR}`, `{USER_AUTHOR}`
- **Dependencies**: FastAPI, SQLAlchemy, Monaco Editor, React Query
- **Added**: 2026-02-05

### Paradigm Management
- **Status**: Active
- **Description**: 4-layer ontology paradigm CRUD with layer-level editing
- **Entry Points**:
  - `api/routes/paradigms.py:1-250` - Paradigm API endpoints
  - `api/models/paradigm.py:1-180` - Paradigm model with generate_primer() and branching fields
- **Dependencies**: FastAPI, SQLAlchemy, PostgreSQL
- **Added**: 2026-01-28

### Paradigm Branching
- **Status**: Active
- **Description**: Create derivative paradigms from existing ones with LLM-powered content generation. Generation runs as a background task with resume support.
- **Entry Points**:
  - `api/routes/paradigms.py:370-441` - Branch creation, lineage, and branches endpoints
  - `api/routes/llm.py:655-948` - LLM generation service for branches (18-field sequential generation with resume)
  - `api/routes/llm.py:966-1003` - Background task runner with error handling
  - `api/routes/llm.py:1006-1040` - Generate endpoint (launches background task, returns immediately)
  - `api/models/paradigm.py:53-63` - Branching fields (parent_paradigm_key, branch_metadata, branch_depth, generation_status)
  - `frontend/src/components/paradigms/BranchParadigmModal.tsx:1-170` - Modal for creating branches
  - `frontend/src/components/paradigms/BranchGenerationProgress.tsx:1-248` - Generation progress display with resume button
  - `frontend/src/components/paradigms/ParadigmLineage.tsx:1-150` - Lineage visualization
- **Dependencies**: Anthropic SDK, React Query
- **Added**: 2026-01-28

### Pipeline Management
- **Status**: Active
- **Description**: Multi-stage pipeline composition with DAG structure
- **Entry Points**:
  - `api/routes/pipelines.py:1-250` - Pipeline and stage endpoints
  - `api/models/pipeline.py:1-120` - Pipeline and PipelineStage models
- **Dependencies**: FastAPI, SQLAlchemy, PostgreSQL
- **Added**: 2026-01-28

### Consumer Registry
- **Status**: Active
- **Description**: Track services that depend on engine/paradigm definitions
- **Entry Points**:
  - `api/routes/consumers.py:1-200` - Consumer registration and dependency tracking
  - `api/models/consumer.py:1-100` - Consumer and ConsumerDependency models
- **Dependencies**: FastAPI, SQLAlchemy, PostgreSQL
- **Added**: 2026-01-28

### Change Tracking
- **Status**: Active
- **Description**: Version control and change propagation for all definitions
- **Entry Points**:
  - `api/routes/changes.py:1-280` - Change events and notifications
  - `api/models/change.py:1-120` - ChangeEvent and ChangeNotification models
- **Dependencies**: FastAPI, SQLAlchemy, PostgreSQL
- **Added**: 2026-01-28

### LLM Integration
- **Status**: Active
- **Description**: AI-powered suggestions for paradigms, prompts, and schemas with structured JSON responses
- **Entry Points**:
  - `api/routes/llm.py:1-100` - JSON parsing helper and StructuredSuggestion schema
  - `api/routes/llm.py:100-240` - Paradigm suggestions endpoint with structured JSON prompts
  - `api/routes/llm.py:240-450` - Prompt improvement and schema validation endpoints
- **Dependencies**: Anthropic SDK (Claude API)
- **Added**: 2026-01-28 | **Modified**: 2026-01-28

### Structured Suggestion Display
- **Status**: Active
- **Description**: Collapsible suggestion cards with edit-before-accept, confidence indicators, and bulk actions
- **Entry Points**:
  - `frontend/src/components/SuggestionCard.tsx:1-175` - Single suggestion card with edit/accept/dismiss
  - `frontend/src/components/SuggestionPanel.tsx:1-130` - Panel containing multiple suggestion cards
  - `frontend/src/pages/paradigms/[key].tsx:24-35` - SuggestionState interface with new response format
  - `frontend/src/pages/paradigms/[key].tsx:200-270` - handleAskAI and handleAcceptSuggestion functions
- **Dependencies**: React, Lucide icons
- **Added**: 2026-01-28

### Functions Browsing UI
- **Status**: Active
- **Description**: Browse decider-v2 LLM function definitions from analyzer-v2's functions registry. List page with card grid, search, and category/tier/project filters. Detail page with 3 tabs: Overview, Prompts, Implementations.
- **Entry Points**:
  - `frontend/src/pages/functions/index.tsx:1-238` - List page with search, category/tier/project filters, color-coded badges
  - `frontend/src/pages/functions/[key].tsx:1-532` - Detail page with 3 tabs (Overview, Prompts, Implementations)
  - `frontend/src/types/index.ts` - FunctionCategory, FunctionTier, InvocationPattern, PromptTemplate, ModelConfigSpec, IOContract, FunctionImplementation, FunctionDefinition, FunctionSummary types
  - `frontend/src/lib/api.ts:740-798` - Functions API namespace (list, get, getCategories, getProjects, getPrompts, getImplementations)
  - `frontend/src/components/Layout.tsx:28` - Functions navigation link (Zap icon)
- **Detail Page Tabs**:
  - **Overview**: Description, model config grid, I/O contract with expandable schemas, DAG links, tags
  - **Prompts**: Expandable accordion per prompt template, dark code viewer, copy button, variable badges
  - **Implementations**: Grouped by project, GitHub source links with line numbers, "Primary" badge
- **Data Source**: Fetches directly from analyzer-v2 `/v1/functions` endpoints (no mgmt backend)
- **Dependencies**: React Query, Next.js, Lucide icons (Zap), analyzer-v2 API
- **Added**: 2026-02-12

## Frontend UI

### Runs List
- **Status**: Active
- **Description**: Executor jobs (+ dossier jobs when the route exists) with status, plan, step progress, tokens and ledger cost; entry to the Run Console
- **Entry Points**:
  - `frontend/src/pages/jobs/index.tsx:51-393` - Page (queries, ledger probe, filters, tables)
  - `frontend/src/lib/api.ts:783-796` - `dossierJobs.list` (404 → unavailable)
- **Dependencies**: The Analyst `/v1/executor/jobs`, `/v1/orchestrator/plans`, `/v1/events/{id}/summary`, `/v1/dossier/jobs`
- **Added**: 2026-09-03

### Run Console
- **Status**: Active
- **Description**: "Under the hood" page for one run — strategy + alternatives, phase tree with live pips, prompt | output per node, timeline, executive view, cost meter
- **Entry Points**:
  - `frontend/src/pages/jobs/[id]/console.tsx:53-406` - Page (queries, fixture loading, layout)
  - `frontend/src/lib/events.ts:48-197` - `useRunEvents` (replay → SSE → polling → 404 degrade; fixture/replay)
  - `frontend/src/components/console/model.ts:130-720` - `buildConsoleTree`, `defaultSelection`, helpers
  - `frontend/src/components/console/PhaseTree.tsx:28-207` - Tree with pips and per-node stats
  - `frontend/src/components/console/NodeDetail.tsx:78-351` - Selected node: prompt | output, stats, narration
  - `frontend/src/components/console/Timeline.tsx:74-150` - Kind-coloured event list
  - `frontend/src/components/console/widgets.tsx:1-158` - StatusPip/Tag, StatChip, KindChip, CostMeter, Toggle
  - `frontend/src/fixtures/events-sample.json` - Dev fixture (`?fixture=1`)
  - `frontend/src/lib/api.ts:737-781` - `executorJobs.results/phaseOutputs`, `plans.*`, `runEvents.*`
  - `frontend/src/types/index.ts:2178-2364` - Console types
- **Dependencies**: The Analyst executor/orchestrator/events routes; EventSource
- **Added**: 2026-09-03

### Settings
- **Status**: Active
- **Description**: Backend URLs (build-time env) and live health probes
- **Entry Points**:
  - `frontend/src/pages/settings.tsx:1-128` - Page
  - `frontend/src/lib/config.ts:1-15` - `ANALYZER_V2_URL`, `API_BASE`
- **Added**: 2026-09-03

### Layout and Navigation
- **Status**: Active
- **Description**: Responsive sidebar layout with navigation
- **Entry Points**:
  - `frontend/src/components/Layout.tsx:1-207` - Main layout component (grouped sidebar: Story / Definitions; The Analyst branding)
  - `frontend/src/pages/_app.tsx:1-30` - App wrapper with React Query
- **Dependencies**: Next.js, Tailwind CSS
- **Added**: 2026-01-28

### Implementations (Pipeline Orchestration)
- **Status**: Active
- **Description**: Pipeline orchestration view showing how workflows wire engines and chains together, with depth-toggled stance sequences and data flow visualization
- **Entry Points**:
  - `frontend/src/pages/implementations/index.tsx:1-207` - List page grouped by source project
  - `frontend/src/pages/implementations/[key].tsx:1-492` - Detail page with pipeline flow, depth toggle, engine cards, data flow summary
  - `frontend/src/lib/api.ts:480-500` - Chain API methods (list, get)
  - `frontend/src/types/index.ts:334-368` - EngineChainSpec, ChainSummary, ChainBlendMode types
  - `frontend/src/components/Layout.tsx:38` - Nav item
- **Dependencies**: React Query, Lucide icons, analyzer-v2 chains/workflows/capability-definitions/operationalizations APIs
- **Added**: 2026-02-18

### Dashboard
- **Status**: Active
- **Description**: Overview stats and recent changes
- **Entry Points**:
  - `frontend/src/pages/index.tsx:1-150` - Dashboard with stat cards
- **Dependencies**: React Query, Lucide icons
- **Added**: 2026-01-28

### Engine List & Detail
- **Status**: Active
- **Description**: Browse and edit engine definitions with Monaco editor
- **Entry Points**:
  - `frontend/src/pages/engines/index.tsx:1-180` - Engine grid with filtering
  - `frontend/src/pages/engines/[key].tsx:1-350` - Detail view with prompt editors
- **Dependencies**: Monaco Editor, React Query
- **Added**: 2026-01-28

### Paradigm List & 4-Layer Editor
- **Status**: Active
- **Description**: Visual 4-layer ontology editor for paradigms
- **Entry Points**:
  - `frontend/src/pages/paradigms/index.tsx:1-100` - Paradigm grid
  - `frontend/src/pages/paradigms/[key].tsx:1-350` - 4-layer visual editor
- **Dependencies**: React, Tailwind CSS
- **Added**: 2026-01-28

## Infrastructure

### Database Migrations
- **Status**: Active
- **Description**: Alembic migrations for PostgreSQL schema
- **Entry Points**:
  - `db/migrations/env.py:1-80` - Alembic environment config
- **Dependencies**: Alembic, SQLAlchemy
- **Added**: 2026-01-28

### Data Migration Script
- **Status**: Active
- **Description**: Import JSON definitions from analyzer-v2 to PostgreSQL
- **Entry Points**:
  - `scripts/migrate_json_to_postgres.py:1-250` - Migration script
- **Dependencies**: SQLAlchemy, asyncpg
- **Added**: 2026-01-28

### Stage Context Migration Script
- **Status**: Active
- **Description**: Convert legacy engine prompts to stage_context format
- **Entry Points**:
  - `scripts/migrate_engines_to_stage_context.py:1-460` - Migration script with framework detection
  - `db/migrations/versions/001_add_stage_context.py:1-66` - Alembic migration
- **Dependencies**: SQLAlchemy, asyncpg, regex
- **Added**: 2026-01-29

## Types and API Client

### TypeScript Types
- **Status**: Active
- **Description**: Comprehensive TypeScript types for all entities including StageContext and LLM types
- **Entry Points**:
  - `frontend/src/types/index.ts:1-350` - All type definitions
  - `frontend/src/types/index.ts:31-82` - StageContext, ExtractionContext, CurationContext, AudienceVocabulary
  - `frontend/src/types/index.ts:133-136` - EngineUpdate type for update payloads
  - `frontend/src/types/index.ts:278-310` - StructuredSuggestion and SuggestionResponse interfaces
- **Dependencies**: TypeScript
- **Added**: 2026-01-28 | **Modified**: 2026-01-29

### API Client
- **Status**: Active
- **Description**: Type-safe API client for frontend
- **Entry Points**:
  - `frontend/src/lib/api.ts:1-400` - ApiClient class with all methods
- **Dependencies**: fetch API
- **Added**: 2026-01-28

### View Definitions CRUD
- **Status**: Active
- **Description**: Full management UI for view definitions (declarative UI rendering specs from analyzer-v2). List page with grouped cards, filter/search, detail/edit page with 6 tabs, create mode, delete with confirm.
- **Entry Points**:
  - `frontend/src/pages/views/index.tsx:1-280` - List page with grouped cards, filters, search
  - `frontend/src/pages/views/[key].tsx:1-700` - Detail/edit page with 6 tabs (Identity, Target, Renderer, Data Source, Transformation, Preview), create mode, delete
  - `frontend/src/lib/api.ts:876-940` - Views API client (list, get, create, update, delete, forWorkflow, reload) via direct fetch to ANALYZER_V2_URL
  - `frontend/src/types/index.ts:1374-1428` - ViewDefinition, ViewSummary, DataSourceRef, TransformationSpec types
  - `frontend/src/components/Layout.tsx:46` - Views nav item with Eye icon
- **Dependencies**: React Query, analyzer-v2 Views API
- **Added**: 2026-02-18
