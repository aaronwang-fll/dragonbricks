from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core import database
from app.core.config import settings
from app.core.database import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - setup and teardown."""
    # Startup: test DB connection, fall back to SQLite if needed, then create tables
    try:
        await database.try_connect_or_fallback()
        async with database.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Database unavailable at startup: %s", e)
    yield
    # Shutdown: Close database connections
    try:
        await database.engine.dispose()
    except Exception:
        pass


app = FastAPI(
    title=settings.APP_NAME,
    description="Natural language to Pybricks Python code converter for LEGO SPIKE Prime",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Root endpoint."""
    return {"name": settings.APP_NAME, "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
