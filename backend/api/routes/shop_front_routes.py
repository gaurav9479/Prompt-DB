from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}





from sqlalchemy import select, func, and_
from backend.models.shop import Shop
from backend.models.order import Order
from backend.models.product import Product
from datetime import datetime, timedelta

from backend.api.controllers import shop_front_controller

router = APIRouter()

@router.get("/shop/products")
async def shop_list_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    return await shop_front_controller.shop_list_products(category_id=category_id, search=search, skip=skip, limit=limit, db=db)

@router.get("/shop/categories")
async def shop_list_categories(db: AsyncSession = Depends(get_db)):
    return await shop_front_controller.shop_list_categories(db=db)

@router.get("/shop/product/{product_id}")
async def shop_get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    return await shop_front_controller.shop_get_product(product_id=product_id, db=db)

