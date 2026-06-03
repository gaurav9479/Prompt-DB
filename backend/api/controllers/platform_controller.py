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

async def get_platform_stats(db: AsyncSession = None):

    service = UserService(db)
    return await service.get_platform_stats()



async def get_all_platform_shops(
    is_verified: Optional[bool] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = None
):

    service = ShopService(db)
    shops = await service.get_all(skip, limit)

    if is_verified is not None:
        shops = [s for s in shops if s.is_verified == is_verified]
    if is_active is not None:
        shops = [s for s in shops if s.is_active == is_active]
    return shops



async def verify_shop(shop_id: int, db: AsyncSession = None):

    service = ShopService(db)
    shop = await service.get_by_id(shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop.is_verified = True
    await db.commit()
    await db.refresh(shop)
    return {"message": f"Shop '{shop.name}' has been verified", "shop_id": shop_id}



async def suspend_shop(shop_id: int, db: AsyncSession = None):

    service = ShopService(db)
    shop = await service.get_by_id(shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop.is_active = False
    await db.commit()
    await db.refresh(shop)
    return {"message": f"Shop '{shop.name}' has been suspended", "shop_id": shop_id}



async def activate_shop(shop_id: int, db: AsyncSession = None):

    service = ShopService(db)
    shop = await service.get_by_id(shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop.is_active = True
    await db.commit()
    await db.refresh(shop)
    return {"message": f"Shop '{shop.name}' has been activated", "shop_id": shop_id}





