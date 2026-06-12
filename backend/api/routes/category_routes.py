from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List

from backend.core.database import get_db


from backend.schemas.product import (

    CategoryCreate, CategoryUpdate, CategoryResponse
)




from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}







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

