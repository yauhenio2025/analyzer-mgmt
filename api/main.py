"""Analyzer Management Console API.

FastAPI backend for managing analytical engines, paradigms, and pipelines.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import engines, paradigms, pipelines, consumers, changes, llm
from models.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Create tables on startup (in production, use Alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Analyzer Management Console",
    description="Visual management interface for analytical engines, paradigms, and pipelines",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://analyzer-mgmt.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(engines.router, prefix="/api/engines", tags=["Engines"])
app.include_router(paradigms.router, prefix="/api/paradigms", tags=["Paradigms"])
app.include_router(pipelines.router, prefix="/api/pipelines", tags=["Pipelines"])
app.include_router(consumers.router, prefix="/api/consumers", tags=["Consumers"])
app.include_router(changes.router, prefix="/api/changes", tags=["Changes"])
app.include_router(llm.router, prefix="/api/llm", tags=["LLM"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "analyzer-mgmt",
        "status": "healthy",
        "version": "1.0.0",
    }


@app.get("/api/stats")
async def get_stats():
    """Get overall system statistics."""
    # TODO: Implement actual stats query
    return {
        "engines": {"total": 156, "active": 156},
        "paradigms": {"total": 4, "active": 4},
        "pipelines": {"total": 19, "active": 19},
        "consumers": {"total": 3, "registered": 3},
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
