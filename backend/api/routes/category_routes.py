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

from backend.api.controllers import category_controller

router = APIRouter()

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    return await category_controller.list_categories(db=db)

@router.get("/categories/with-counts")
async def list_categories_with_counts(db: AsyncSession = Depends(get_db)):
    return await category_controller.list_categories_with_counts(db=db)

@router.get("/categories/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: int, db: AsyncSession = Depends(get_db)):
    return await category_controller.get_category(category_id=category_id, db=db)

@router.post("/categories", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    return await category_controller.create_category(data=data, db=db)

@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: int, data: CategoryUpdate, db: AsyncSession = Depends(get_db)):
    return await category_controller.update_category(category_id=category_id, data=data, db=db)

@router.delete("/categories/{category_id}")
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    return await category_controller.delete_category(category_id=category_id, db=db)

