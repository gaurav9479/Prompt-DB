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

async def list_products(
    shop_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    include_inactive: bool = False,
    db: AsyncSession = None
):
    service = ProductService(db)
    return await service.get_all(skip, limit, shop_id, category_id, search, not include_inactive, include_inactive)



async def get_featured_products(limit: int = 10, db: AsyncSession = None):
    service = ProductService(db)
    return await service.get_featured(limit)



async def get_low_stock_products(db: AsyncSession = None):
    service = ProductService(db)
    products = await service.get_low_stock()
    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "quantity": p.quantity,
            "min_stock_level": p.min_stock_level,
            "category_id": p.category_id
        }
        for p in products
    ]



async def search_products(query: str, limit: int = 20, db: AsyncSession = None):
    service = ProductService(db)
    return await service.search(query, limit)



async def get_inventory_stats(db: AsyncSession = None):
    service = ProductService(db)
    return await service.get_inventory_stats()





async def get_expiring_soon_products(
    days: int = 30,
    shop_id: Optional[int] = None,
    db: AsyncSession = None
):

    service = ProductService(db)
    products = await service.get_expiring_soon(days, shop_id)
    return [
        {
            "id": p.id,
            "name": p.name,
            "shop_id": p.shop_id,
            "price": p.price,
            "quantity": p.quantity,
            "expiry_date": p.expiry_date,
            "days_until_expiry": p.days_until_expiry,
            "is_on_clearance": p.is_on_clearance,
            "clearance_discount": p.clearance_discount,
            "clearance_price": p.clearance_price
        }
        for p in products
    ]



async def get_expired_products(
    shop_id: Optional[int] = None,
    db: AsyncSession = None
):

    service = ProductService(db)
    products = await service.get_expired_products(shop_id)
    return [
        {
            "id": p.id,
            "name": p.name,
            "shop_id": p.shop_id,
            "price": p.price,
            "quantity": p.quantity,
            "expiry_date": p.expiry_date,
            "days_until_expiry": p.days_until_expiry,
            "is_active": p.is_active
        }
        for p in products
    ]



async def get_clearance_products(
    shop_id: Optional[int] = None,
    db: AsyncSession = None
):

    service = ProductService(db)
    products = await service.get_clearance_products(shop_id)
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "brand": p.brand,
            "shop_id": p.shop_id,
            "original_price": p.price,
            "clearance_price": p.clearance_price,
            "discount_percent": p.clearance_discount,
            "quantity": p.quantity,
            "image_url": p.image_url,
            "in_stock": p.quantity > 0
        }
        for p in products
    ]



async def get_expiry_stats(
    shop_id: Optional[int] = None,
    db: AsyncSession = None
):

    service = ProductService(db)
    return await service.get_expiry_stats(shop_id)



async def apply_clearance_to_product(
    product_id: int,
    discount: Optional[float] = None,
    db: AsyncSession = None
):

    service = ProductService(db)
    product = await service.apply_clearance_sale(product_id, discount)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await manager.broadcast_update("product", "clearance_applied", {
        "id": product.id,
        "name": product.name,
        "clearance_price": product.clearance_price
    })
    return {
        "message": f"Clearance sale applied to {product.name}",
        "original_price": product.price,
        "clearance_price": product.clearance_price,
        "discount": product.clearance_discount
    }



async def remove_clearance_from_product(
    product_id: int,
    db: AsyncSession = None
):

    service = ProductService(db)
    product = await service.remove_from_clearance(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": f"Clearance removed from {product.name}"}



async def check_and_apply_expiry_clearance(
    shop_id: Optional[int] = None,
    db: AsyncSession = None
):

    service = ProductService(db)
    newly_on_clearance = await service.check_and_apply_clearance(shop_id)
    deactivated = await service.deactivate_expired_products(shop_id)

    for product in newly_on_clearance:
        await manager.broadcast_update("product", "auto_clearance", {
            "id": product.id,
            "name": product.name,
            "days_until_expiry": product.days_until_expiry
        })

    return {
        "products_put_on_clearance": len(newly_on_clearance),
        "products_deactivated": len(deactivated),
        "clearance_products": [
            {"id": p.id, "name": p.name, "days_left": p.days_until_expiry}
            for p in newly_on_clearance
        ],
        "expired_products": [
            {"id": p.id, "name": p.name}
            for p in deactivated
        ]
    }



async def get_product(product_id: int, db: AsyncSession = None):
    service = ProductService(db)
    product = await service.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # Increment view count, then re-fetch so Pydantic serializes a fully-loaded object
    await service.increment_view(product_id)
    product = await service.get_by_id(product_id)
    return product



async def create_product(data: ProductCreate, category_name: Optional[str] = None, db: AsyncSession = None):
    service = ProductService(db)

    if data.sku:
        existing = await service.get_by_sku(data.sku)
        if existing:
            raise HTTPException(status_code=400, detail="Product with this SKU already exists")
    
    # Create product with auto-category support
    product = await service.create(data, category_name=category_name)
    
    # Fetch complete product data with category
    full_product = await service.get_by_id(product.id)
    
    await manager.broadcast_update("product", "created", {
        "id": product.id, "name": product.name, "price": product.price,
        "profit_margin": full_product.profit_margin,
        "stock_status": full_product.stock_status
    })
    return full_product



async def update_product(product_id: int, data: ProductUpdate, db: AsyncSession = None):
    service = ProductService(db)
    product = await service.update(product_id, data)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await manager.broadcast_update("product", "updated", {
        "id": product.id, "name": product.name, "price": product.price
    })
    return product



async def update_product_stock(
    product_id: int,
    quantity: int,
    adjustment_type: str = "set",
    db: AsyncSession = None
):

    service = ProductService(db)
    product = await service.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if adjustment_type == "set":
        product.quantity = quantity
    elif adjustment_type == "add":
        product.quantity += quantity
    elif adjustment_type == "subtract":
        product.quantity = max(0, product.quantity - quantity)

    await db.commit()
    await db.refresh(product)
    await manager.broadcast_update("product", "stock_updated", {
        "id": product.id, "name": product.name, "quantity": product.quantity
    })
    return {"id": product.id, "quantity": product.quantity}



async def delete_product(product_id: int, db: AsyncSession = None):
    service = ProductService(db)
    success = await service.delete(product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    await manager.broadcast_update("product", "deleted", {"id": product_id})
    return {"message": "Product deleted"}





