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

engine = create_async_engine(DATABASE_URL, echo=True, connect_args=connect_args)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning("Database unavailable, skipping init_db(): %s", e)
