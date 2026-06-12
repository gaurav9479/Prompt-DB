from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db
from backend.core.websocket import manager
from backend.schemas.command import CommandInput, CommandResponse, ParsedIntent, MultiStepPlan


from backend.schemas.shop import (

    ShopCategoryCreate, ShopCategoryUpdate, ShopCategoryResponse
)
from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}


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

