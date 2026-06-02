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

async def login(data: UserLogin, db: AsyncSession = None):

    service = UserService(db)
    user = await service.authenticate(data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return LoginResponse(user=user)



async def register(data: UserCreate, db: AsyncSession = None):

    service = UserService(db)
    existing = await service.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    data.role = UserRole.CUSTOMER.value
    user = await service.create(data)
    return user



async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = None):

    service = UserService(db)
    token = await service.generate_reset_token(data.email)

    if not token:

        return ForgotPasswordResponse(
            message="If an account with this email exists, a reset link has been sent.",
            reset_token=None
        )


    return ForgotPasswordResponse(
        message="Password reset link generated. In production, this would be sent via email.",
        reset_token=token 
    )



async def verify_reset_token(data: VerifyResetTokenRequest, db: AsyncSession = None):

    service = UserService(db)
    user = await service.verify_reset_token(data.token)

    if not user:
        return VerifyResetTokenResponse(valid=False, email=None)


    email = user.email
    masked_email = email[0:2] + "***" + email[email.index("@"):]

    return VerifyResetTokenResponse(valid=True, email=masked_email)



async def reset_password(data: ResetPasswordRequest, db: AsyncSession = None):

    service = UserService(db)
    success = await service.reset_password(data.token, data.new_password)

    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    return ResetPasswordResponse(
        success=True,
        message="Password has been reset successfully. You can now login with your new password."
    )


async def register_shopkeeper(data: ShopOwnerRegister, db: AsyncSession = None):
    user_service = UserService(db)
    shop_service = ShopService(db)

    # 1. Check if email is already registered as user
    existing = await user_service.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create the Shop
    shop_create_data = ShopCreate(
        name=data.shop_name,
        description=data.shop_description,
        category_id=data.shop_category_id,
        owner_name=data.name,
        owner_email=data.email,
        owner_phone=data.phone,
        address=data.address,
        city=data.city,
        pincode=data.pincode,
        gst_number=data.gst_number,
    )
    
    shop_data = shop_create_data.model_dump()
    shop_data.pop("password", None)
    
    shop = Shop(**shop_data)
    shop.is_active = True
    shop.is_verified = True
    
    db.add(shop)
    await db.commit()
    await db.refresh(shop)

    # 3. Create the User (role=admin, linked to shop.id)
    user_create_data = UserCreate(
        email=data.email,
        password=data.password,
        name=data.name,
        phone=data.phone,
        role=UserRole.ADMIN.value,
        shop_id=shop.id,
    )
    
    user = await user_service.create(user_create_data)
    return user





