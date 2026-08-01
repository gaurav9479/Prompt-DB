import asyncio
import time
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
import logging

from backend.core.config import settings

logger = logging.getLogger(__name__)

from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

# Convert scheme to asyncpg dialect and handle ssl query params which
# asyncpg.connect doesn't accept as keyword args. If the URL contains
# `sslmode` (e.g. sslmode=require) we'll remove it from the query string
# and pass `connect_args={"ssl": True}` to create_async_engine.
raw_url = settings.DATABASE_URL
parsed = urlparse(raw_url)
query_items = dict(parse_qsl(parsed.query, keep_blank_values=True))

connect_args = {}
# Remove ssl-related query params that asyncpg doesn't accept as kwargs
for unwanted in ("sslmode", "channel_binding"):
    if unwanted in query_items:
        val = query_items.pop(unwanted)
        if unwanted == "sslmode" and val and val.lower() in ("require", "verify-ca", "verify-full"):
            connect_args["ssl"] = True

# rebuild url without sslmode
new_query = urlencode(query_items)
new_parsed = parsed._replace(scheme=parsed.scheme.replace("postgresql", "postgresql+asyncpg"), query=new_query)
DATABASE_URL = urlunparse(new_parsed)

engine = create_async_engine(DATABASE_URL, echo=True, connect_args=connect_args, pool_pre_ping=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

LAST_DB_CHECK = 0
DB_CHECK_INTERVAL = 300 # 5 minutes

async def get_db():
    global LAST_DB_CHECK
    current_time = time.time()
    
    # If the database hasn't been verified in the last 5 minutes, verify connectivity with retries
    if current_time - LAST_DB_CHECK > DB_CHECK_INTERVAL:
        max_retries = 5
        retry_delay = 2
        db_ok = False
        for attempt in range(max_retries):
            try:
                async with async_session() as session:
                    await session.execute(text("SELECT 1"))
                    db_ok = True
                    LAST_DB_CHECK = current_time
                    logger.info("Database connectivity verified successfully.")
                    break
            except Exception as e:
                logger.warning(
                    "Database wakeup check failed (attempt %d/%d). Retrying in %ds... Error: %s",
                    attempt + 1, max_retries, retry_delay, e
                )
                await asyncio.sleep(retry_delay)
        if not db_ok:
            logger.error("Database connection failed wakeup checks after multiple attempts.")

    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    max_retries = 5
    retry_delay = 2
    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database initialized successfully.")
            return
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(
                    "Database unavailable during init_db() (attempt %d/%d). Retrying in %ds... Error: %s",
                    attempt + 1, max_retries, retry_delay, e
                )
                await asyncio.sleep(retry_delay)
            else:
                logger.error("Database initialization failed after %d attempts: %s", max_retries, e)
