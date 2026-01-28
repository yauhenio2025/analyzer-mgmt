# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
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
