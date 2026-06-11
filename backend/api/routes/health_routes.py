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

from backend.api.controllers import health_controller

router = APIRouter()

@router.get("/health")
async def health_check():
    return await health_controller.health_check()

