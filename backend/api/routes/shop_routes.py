from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db

from backend.schemas.product import (
    ProductResponse
)
from backend.schemas.shop import (
    ShopCreate, ShopUpdate, ShopResponse,

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

from backend.api.controllers import shop_controller

router = APIRouter()

@router.get("/shops", response_model=List[ShopResponse])
async def list_shops(
    category_id: Optional[int] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    return await shop_controller.list_shops(category_id=category_id, city=city, search=search, skip=skip, limit=limit, db=db)

@router.get("/shops/by-category/{category_id}")
async def get_shops_by_category(category_id: int, db: AsyncSession = Depends(get_db)):
    return await shop_controller.get_shops_by_category(category_id=category_id, db=db)

@router.get("/shops/{shop_id}", response_model=ShopResponse)
async def get_shop(shop_id: int, db: AsyncSession = Depends(get_db)):
    return await shop_controller.get_shop(shop_id=shop_id, db=db)

@router.get("/shops/{shop_id}/dashboard")
async def get_shop_dashboard(shop_id: int, db: AsyncSession = Depends(get_db)):
    return await shop_controller.get_shop_dashboard(shop_id=shop_id, db=db)

@router.get("/shops/{shop_id}/admin-stats")
async def get_shop_admin_stats(shop_id: int, db: AsyncSession = Depends(get_db)):
    return await shop_controller.get_shop_admin_stats(shop_id=shop_id, db=db)

@router.get("/shops/{shop_id}/products", response_model=List[ProductResponse])
async def get_shop_products(
    shop_id: int,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db)
):
    return await shop_controller.get_shop_products(shop_id=shop_id, category_id=category_id, search=search, skip=skip, limit=limit, include_inactive=include_inactive, db=db)

@router.get("/shops/{shop_id}/low-stock")
async def get_shop_low_stock(shop_id: int, db: AsyncSession = Depends(get_db)):
    return await shop_controller.get_shop_low_stock(shop_id=shop_id, db=db)

@router.get("/shops/{shop_id}/orders")
async def get_shop_orders(
    shop_id: int,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    return await shop_controller.get_shop_orders(shop_id=shop_id, status=status, skip=skip, limit=limit, db=db)

@router.post("/shops", response_model=ShopResponse)
async def create_shop(data: ShopCreate, db: AsyncSession = Depends(get_db)):
    return await shop_controller.create_shop(data=data, db=db)

@router.put("/shops/{shop_id}", response_model=ShopResponse)
async def update_shop(shop_id: int, data: ShopUpdate, db: AsyncSession = Depends(get_db)):
    return await shop_controller.update_shop(shop_id=shop_id, data=data, db=db)

@router.delete("/shops/{shop_id}")
async def delete_shop(shop_id: int, db: AsyncSession = Depends(get_db)):
    return await shop_controller.delete_shop(shop_id=shop_id, db=db)

@router.get("/shops/{shop_id}/expiring-soon")
async def get_shop_expiring_products(
    shop_id: int,
    days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    return await shop_controller.get_shop_expiring_products(shop_id=shop_id, days=days, db=db)

@router.get("/shops/{shop_id}/clearance")
async def get_shop_clearance_products(
    shop_id: int,
    db: AsyncSession = Depends(get_db)
):
    return await shop_controller.get_shop_clearance_products(shop_id=shop_id, db=db)

