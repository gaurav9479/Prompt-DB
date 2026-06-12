from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db

from backend.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductWithCategory
)

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}





from sqlalchemy import select, func, and_
from backend.models.shop import Shop
from backend.models.order import Order
from backend.models.product import Product
from datetime import datetime, timedelta

from backend.api.controllers import product_controller

router = APIRouter()

@router.get("/products", response_model=List[ProductResponse])
async def list_products(
    skip: int = 0,
    limit: int = 100,
    shop_id: Optional[int] = Query(None),
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db)
):
    return await product_controller.list_products(skip=skip, limit=limit, shop_id=shop_id, category_id=category_id, search=search, include_inactive=include_inactive, db=db)

@router.get("/products/featured")
async def get_featured_products(limit: int = 10, db: AsyncSession = Depends(get_db)):
    return await product_controller.get_featured_products(limit=limit, db=db)

@router.get("/products/low-stock")
async def get_low_stock_products(db: AsyncSession = Depends(get_db)):
    return await product_controller.get_low_stock_products(db=db)

@router.get("/products/search/{query}")
async def search_products(query: str, limit: int = 20, db: AsyncSession = Depends(get_db)):
    return await product_controller.search_products(query=query, limit=limit, db=db)

@router.get("/products/inventory-stats")
async def get_inventory_stats(db: AsyncSession = Depends(get_db)):
    return await product_controller.get_inventory_stats(db=db)

@router.get("/products/expiring-soon")
async def get_expiring_soon_products(
    days: int = 30,
    shop_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    return await product_controller.get_expiring_soon_products(days=days, shop_id=shop_id, db=db)

@router.get("/products/expired")
async def get_expired_products(
    shop_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    return await product_controller.get_expired_products(shop_id=shop_id, db=db)

@router.get("/products/clearance")
async def get_clearance_products(
    shop_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    return await product_controller.get_clearance_products(shop_id=shop_id, db=db)

@router.get("/products/expiry-stats")
async def get_expiry_stats(
    shop_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    return await product_controller.get_expiry_stats(shop_id=shop_id, db=db)

@router.post("/products/{product_id}/apply-clearance")
async def apply_clearance_to_product(
    product_id: int,
    discount: Optional[float] = None,
    db: AsyncSession = Depends(get_db)
):
    return await product_controller.apply_clearance_to_product(product_id=product_id, discount=discount, db=db)

@router.post("/products/{product_id}/remove-clearance")
async def remove_clearance_from_product(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    return await product_controller.remove_clearance_from_product(product_id=product_id, db=db)

@router.post("/products/check-expiry")
async def check_and_apply_expiry_clearance(
    shop_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    return await product_controller.check_and_apply_expiry_clearance(shop_id=shop_id, db=db)

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    return await product_controller.get_product(product_id=product_id, db=db)

@router.post("/products", response_model=ProductWithCategory)
async def create_product(
    data: ProductCreate,
    category_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Create a product. Optionally auto-create category by name.
    
    Args:
        category_name: If provided and category_id is None, auto-creates category with this name
        data: Product data (required fields: name, price)
    
    Returns:
        Created product with calculated fields (profit_margin, stock_status)
    """
    return await product_controller.create_product(data=data, category_name=category_name, db=db)

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, data: ProductUpdate, db: AsyncSession = Depends(get_db)):
    return await product_controller.update_product(product_id=product_id, data=data, db=db)

@router.patch("/products/{product_id}/stock")
async def update_product_stock(
    product_id: int,
    quantity: int,
    adjustment_type: str = "set",
    db: AsyncSession = Depends(get_db)
):
    return await product_controller.update_product_stock(product_id=product_id, quantity=quantity, adjustment_type=adjustment_type, db=db)

@router.delete("/products/{product_id}")
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    return await product_controller.delete_product(product_id=product_id, db=db)

