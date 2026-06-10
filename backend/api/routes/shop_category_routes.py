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

from backend.api.controllers import shop_category_controller

router = APIRouter()

@router.get("/shop-categories", response_model=List[ShopCategoryResponse])
async def list_shop_categories(db: AsyncSession = Depends(get_db)):
    return await shop_category_controller.list_shop_categories(db=db)

@router.get("/shop-categories/with-counts")
async def list_shop_categories_with_counts(db: AsyncSession = Depends(get_db)):
    return await shop_category_controller.list_shop_categories_with_counts(db=db)

@router.get("/shop-categories/{category_id}", response_model=ShopCategoryResponse)
async def get_shop_category(category_id: int, db: AsyncSession = Depends(get_db)):
    return await shop_category_controller.get_shop_category(category_id=category_id, db=db)

@router.get("/shop-categories/{category_id}/shops-with-stats")
async def get_category_shops_with_stats(category_id: int, db: AsyncSession = Depends(get_db)):
    return await shop_category_controller.get_category_shops_with_stats(category_id=category_id, db=db)

@router.post("/shop-categories", response_model=ShopCategoryResponse)
async def create_shop_category(data: ShopCategoryCreate, db: AsyncSession = Depends(get_db)):
    return await shop_category_controller.create_shop_category(data=data, db=db)

@router.put("/shop-categories/{category_id}", response_model=ShopCategoryResponse)
async def update_shop_category(category_id: int, data: ShopCategoryUpdate, db: AsyncSession = Depends(get_db)):
    return await shop_category_controller.update_shop_category(category_id=category_id, data=data, db=db)

@router.delete("/shop-categories/{category_id}")
async def delete_shop_category(category_id: int, db: AsyncSession = Depends(get_db)):
    return await shop_category_controller.delete_shop_category(category_id=category_id, db=db)

