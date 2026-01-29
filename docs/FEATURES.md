# Feature Inventory

> Auto-maintained by Claude Code. Last updated: 2026-01-29 (Stage Context Prompt Composition)

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
- **Description**: Create derivative paradigms from existing ones with LLM-powered content generation
- **Entry Points**:
  - `api/routes/paradigms.py:340-460` - Branch creation, lineage, and branches endpoints
  - `api/routes/llm.py:568-780` - LLM generation service for branches (18-field sequential generation)
  - `api/models/paradigm.py:53-63` - Branching fields (parent_paradigm_key, branch_metadata, branch_depth, generation_status)
  - `frontend/src/components/paradigms/BranchParadigmModal.tsx:1-170` - Modal for creating branches
  - `frontend/src/components/paradigms/BranchGenerationProgress.tsx:1-180` - Generation progress display
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

## Frontend UI

### Layout and Navigation
- **Status**: Active
- **Description**: Responsive sidebar layout with navigation
- **Entry Points**:
  - `frontend/src/components/Layout.tsx:1-150` - Main layout component
  - `frontend/src/pages/_app.tsx:1-30` - App wrapper with React Query
- **Dependencies**: Next.js, Tailwind CSS
- **Added**: 2026-01-28

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
