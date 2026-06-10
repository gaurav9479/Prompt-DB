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

async def list_orders(
    status: Optional[str] = None,
    customer_email: Optional[str] = None,
    shop_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = None
):
    service = OrderService(db)
    return await service.get_all(status, customer_email, shop_id, skip, limit)



async def get_order(order_id: int, db: AsyncSession = None):
    service = OrderService(db)
    order = await service.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order



async def create_order(data: OrderCreate, db: AsyncSession = None):
    service = OrderService(db)
    # Note: order_service.create() already deducts stock and updates sold_count internally
    order = await service.create(data)
    if not order:
        raise HTTPException(status_code=400, detail="Failed to create order. Product may not exist or be out of stock.")

    await manager.broadcast_update("order", "created", {
        "id": order.id, "status": order.status, "total": order.total_amount
    })
    return order



async def update_order(order_id: int, data: OrderUpdate, db: AsyncSession = None):
    service = OrderService(db)
    order = await service.update(order_id, data)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    await manager.broadcast_update("order", "updated", {
        "id": order.id, "status": order.status, "total": order.total_amount
    })
    return order



async def cancel_order(order_id: int, db: AsyncSession = None):
    service = OrderService(db)
    order = await service.cancel(order_id)
    if not order:
        raise HTTPException(status_code=400, detail="Cannot cancel order")
    await manager.broadcast_update("order", "cancelled", {"id": order.id, "status": order.status})
    return order





