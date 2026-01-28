# Analyzer Management Console

> Visual management interface for analytical engines, paradigms, and pipelines

## Overview

The Analyzer Management Console (analyzer-mgmt) provides a comprehensive web interface for managing analytical constructs across the Analyzer ecosystem. It offers:
- **Engine Dashboard**: View/edit engine definitions with Monaco editor for prompts
- **Paradigm Editor**: 4-layer ontology editor with LLM-assisted extension
- **Pipeline Composer**: DAG-based pipeline builder with reactflow
- **Consumer Registry**: Track which services depend on which definitions
- **Change Propagation**: Automatic migration and notification system

## Tech Stack
- **Backend**: FastAPI with SQLAlchemy ORM
- **Database**: PostgreSQL with Alembic migrations
- **Frontend**: Next.js 14 with TypeScript
- **UI**: Tailwind CSS, Monaco Editor, Reactflow
- **LLM**: Anthropic Claude API for suggestions

## Quick Reference
- Backend: `cd api && uvicorn main:app --reload --port 8002`
- Frontend: `cd frontend && npm run dev`
- Migrations: `cd api && alembic upgrade head`
- Full stack: `docker-compose up`

## Architecture

```
analyzer-mgmt/
├── api/                    # FastAPI backend
│   ├── main.py             # App entry point
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   └── models/             # SQLAlchemy models
├── db/
│   └── migrations/         # Alembic migrations
├── frontend/               # Next.js app
│   └── src/
│       ├── components/     # React components
│       ├── pages/          # Next.js pages
│       ├── lib/            # API client, utilities
│       └── types/          # TypeScript types
└── scripts/                # Migration and utility scripts
```

## API Endpoints

```
# Engines
GET    /api/engines                      # List all engines
GET    /api/engines/{key}                # Get engine details
PUT    /api/engines/{key}                # Update engine
POST   /api/engines                      # Create engine
DELETE /api/engines/{key}                # Delete engine
GET    /api/engines/{key}/versions       # Version history

# Paradigms
GET    /api/paradigms                    # List all paradigms
GET    /api/paradigms/{key}              # Get paradigm details
PUT    /api/paradigms/{key}              # Update paradigm
POST   /api/paradigms                    # Create paradigm

# Pipelines
GET    /api/pipelines                    # List all pipelines
GET    /api/pipelines/{key}              # Get pipeline details
PUT    /api/pipelines/{key}              # Update pipeline
POST   /api/pipelines                    # Create pipeline

# Consumers
GET    /api/consumers                    # List consumers
POST   /api/consumers                    # Register consumer
GET    /api/consumers/{id}/dependencies  # Get dependencies

# Changes
GET    /api/changes                      # Change history
POST   /api/changes/{id}/propagate       # Trigger propagation

# LLM
POST   /api/llm/paradigm-suggestions     # Get paradigm extension ideas
POST   /api/llm/prompt-improve           # Get prompt improvement
POST   /api/llm/schema-validate          # Validate schema changes
```

## Database Schema

Key tables:
- `engines`: Engine definitions (versioned)
- `engine_versions`: Full snapshots for rollback
- `paradigms`: Paradigm 4-layer definitions
- `pipelines`: Pipeline compositions
- `pipeline_stages`: Individual pipeline stages
- `consumers`: Consumer service registry
- `consumer_dependencies`: What each consumer uses
- `change_events`: All changes with diffs
- `change_notifications`: Notification tracking

## Documentation
- Feature inventory: `docs/FEATURES.md`
- Change history: `docs/CHANGELOG.md`

## Related Projects
- **analyzer-v2**: Source of truth for definitions (JSON files)
- **the-critic**: 12-phase analysis pipeline
- **analyzer**: Main analysis service

## Code Conventions
- Backend: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0
- Frontend: TypeScript, Next.js App Router, Tailwind CSS
- API responses: JSON with consistent error handling
- All changes create version history entries
