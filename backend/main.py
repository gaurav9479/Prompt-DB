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

                pass
    except Exception:

        pass

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Agentic AI Command & Control System",
    lifespan=lifespan,
)


cors_origins = settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"]
if "*" not in cors_origins:
    cors_origins = [
        origin.strip()
        for origin in cors_origins
        if origin and origin.strip()
    ] + ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


from fastapi import Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)


def _add_cors_headers(response: JSONResponse, request: Request) -> JSONResponse:
    origin = request.headers.get("origin")
    if not origin:
        return response

    allowed_origins = {item.strip() for item in settings.CORS_ORIGINS if item and item.strip()}
    if "*" in allowed_origins or origin in allowed_origins or origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1"):
        response.headers["access-control-allow-origin"] = origin
        response.headers["access-control-allow-credentials"] = "true"
        response.headers["vary"] = "Origin"
        response.headers["access-control-allow-methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
        response.headers["access-control-allow-headers"] = request.headers.get("access-control-request-headers", "content-type, authorization")
    return response


@app.middleware("http")
async def secure_database_string_middleware(request: Request, call_next):
    response = await call_next(request)
    response = _add_cors_headers(response, request)
    
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type or "text/" in content_type:
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        

        async def iterator():
            yield body
        response.body_iterator = iterator()
        
        decoded_body = body.decode(errors="ignore")
        if "postgresql://" in decoded_body or "postgres://" in decoded_body:
            logger.error(f"BLOCKED RESPONSE: database connection string detected in response! Path: {request.url.path}")
            error_response = JSONResponse(
                status_code=500,
                content={"detail": "Security Exception: Sensitive connection parameters detected in response payload."}
            )
            return _add_cors_headers(error_response, request)
            
    return response


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
