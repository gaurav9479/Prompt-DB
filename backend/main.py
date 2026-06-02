from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import init_db, async_session
from .api import command_router, category_router, shop_category_router, shop_router, product_router, order_router, customer_router, analytics_router, shop_front_router, ws_router, auth_router, user_router, platform_router, health_router
from .services.user_service import create_default_users


@asynccontextmanager
async def lifespan(app: FastAPI):

    await init_db()

    try:
        async with async_session() as session:
            try:
                await create_default_users(session)
            except Exception:
                # DB may be unavailable; skip creating defaults but allow app to start
                pass
    except Exception:
        # session creation may fail if DB is down; ignore to allow app startup
        pass

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Agentic AI Command & Control System",
    lifespan=lifespan,
)


cors_origins = settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(command_router, prefix="/api")
app.include_router(category_router, prefix="/api")
app.include_router(shop_category_router, prefix="/api")
app.include_router(shop_router, prefix="/api")
app.include_router(product_router, prefix="/api")
app.include_router(order_router, prefix="/api")
app.include_router(customer_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(shop_front_router, prefix="/api")
app.include_router(ws_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(platform_router, prefix="/api")
app.include_router(health_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }
