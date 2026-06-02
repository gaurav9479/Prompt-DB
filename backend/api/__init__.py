from backend.api.routes.command_routes import router as command_router
from backend.api.routes.category_routes import router as category_router
from backend.api.routes.shop_category_routes import router as shop_category_router
from backend.api.routes.shop_routes import router as shop_router
from backend.api.routes.product_routes import router as product_router
from backend.api.routes.order_routes import router as order_router
from backend.api.routes.customer_routes import router as customer_router
from backend.api.routes.analytics_routes import router as analytics_router
from backend.api.routes.shop_front_routes import router as shop_front_router
from backend.api.routes.ws_routes import router as ws_router
from backend.api.routes.auth_routes import router as auth_router
from backend.api.routes.user_routes import router as user_router
from backend.api.routes.platform_routes import router as platform_router
from backend.api.routes.health_routes import router as health_router

__all__ = [
    'command_router',
    'category_router',
    'shop_category_router',
    'shop_router',
    'product_router',
    'order_router',
    'customer_router',
    'analytics_router',
    'shop_front_router',
    'ws_router',
    'auth_router',
    'user_router',
    'platform_router',
    'health_router',
]
