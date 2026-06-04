from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db
from backend.core.websocket import manager
from backend.schemas.command import CommandInput, CommandResponse, ParsedIntent, MultiStepPlan
from backend.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    CategoryCreate, CategoryUpdate, CategoryResponse
)
from backend.schemas.order import OrderCreate, OrderUpdate, OrderResponse
from backend.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from backend.schemas.shop import (
    ShopCreate, ShopUpdate, ShopResponse,
    ShopCategoryCreate, ShopCategoryUpdate, ShopCategoryResponse
)
from backend.services.intent_parser import IntentParser
from backend.services.action_executor import ActionExecutor
from backend.services.product_service import ProductService, CategoryService
from backend.services.order_service import OrderService
from backend.services.customer_service import CustomerService
from backend.services.analytics_service import AnalyticsService
from backend.services.shop_service import ShopService, ShopCategoryService
from backend.services.user_service import UserService
from backend.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserLogin, LoginResponse, ShopOwnerRegister,
    ForgotPasswordRequest, ForgotPasswordResponse, VerifyResetTokenRequest,
    VerifyResetTokenResponse, ResetPasswordRequest, ResetPasswordResponse
)
from backend.models.action_log import ActionLog
from backend.models.customer import Customer
from backend.models.product import Category
from backend.models.user import UserRole
from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}





from sqlalchemy import select, func, and_
from backend.models.shop import Shop
from backend.models.order import Order
from backend.models.product import Product
from datetime import datetime, timedelta

async def shop_list_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = None
):

    service = ProductService(db)
    products = await service.get_all(skip, limit, category_id, search, active_only=True)
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "brand": p.brand,
            "price": p.price,
            "compare_at_price": p.compare_at_price,
            "image_url": p.image_url,
            "category_id": p.category_id,
            "in_stock": p.quantity > 0,
            "unit": p.unit
        }
        for p in products
    ]



async def shop_list_categories(db: AsyncSession = None):

    service = CategoryService(db)
    return await service.get_with_product_count()



async def shop_get_product(product_id: int, db: AsyncSession = None):

    service = ProductService(db)
    product = await service.get_by_id(product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    await service.increment_view(product_id)

    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "brand": product.brand,
        "price": product.price,
        "compare_at_price": product.compare_at_price,
        "image_url": product.image_url,
        "images": product.images,
        "category_id": product.category_id,
        "in_stock": product.quantity > 0,
        "unit": product.unit,
        "tags": product.tags
    }





