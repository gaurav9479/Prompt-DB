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

from backend.api.controllers import analytics_controller

router = APIRouter()

@router.get("/analytics/dashboard")
async def get_dashboard_analytics(db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_dashboard_analytics(db=db)

@router.get("/analytics/revenue")
async def get_revenue_analytics(days: int = 7, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_revenue_analytics(days=days, db=db)

@router.get("/analytics/order-status")
async def get_order_status_distribution(db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_order_status_distribution(db=db)

@router.get("/analytics/top-products")
async def get_top_products(limit: int = 5, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_top_products(limit=limit, db=db)

@router.get("/analytics/top-customers")
async def get_top_customers(limit: int = 5, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_top_customers(limit=limit, db=db)

@router.get("/analytics/recent-orders")
async def get_recent_orders(limit: int = 10, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_recent_orders(limit=limit, db=db)

@router.get("/analytics/monthly-comparison")
async def get_monthly_comparison(db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_monthly_comparison(db=db)

