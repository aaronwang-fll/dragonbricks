import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)

SQLITE_FALLBACK_URL = "sqlite+aiosqlite:///dragonbricks.db"


class Base(DeclarativeBase):
    pass


def _build_engine(url: str):
    kwargs = {
        "echo": settings.DEBUG,
        "pool_pre_ping": True,
    }
    if not url.startswith("sqlite"):
        kwargs["pool_size"] = 10
        kwargs["max_overflow"] = 20
    return create_async_engine(url, **kwargs)


engine = _build_engine(settings.DATABASE_URL)


async def try_connect_or_fallback():
    """Test the primary DB connection; fall back to SQLite if unreachable."""
    global engine, AsyncSessionLocal
    if settings.DATABASE_URL.startswith("sqlite"):
        return
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception as exc:
        logger.warning("Primary database unreachable (%s), falling back to SQLite", exc)
        await engine.dispose()
        engine = _build_engine(SQLITE_FALLBACK_URL)
        AsyncSessionLocal.configure(bind=engine)


AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    """Dependency for getting database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
