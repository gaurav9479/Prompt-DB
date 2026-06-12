from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List


from backend.core.websocket import manager

from backend.schemas.product import (

    CategoryCreate, CategoryUpdate, 
)



from backend.services.product_service import CategoryService

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}


async def list_categories(db: AsyncSession = None):
    service = CategoryService(db)
    return await service.get_all()



async def list_categories_with_counts(db: AsyncSession = None):
    service = CategoryService(db)
    return await service.get_with_product_count()



async def get_category(category_id: int, db: AsyncSession = None):
    service = CategoryService(db)
    category = await service.get_by_id(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category



async def create_category(data: CategoryCreate, db: AsyncSession = None):
    service = CategoryService(db)
    category = await service.create(data)
    await manager.broadcast_update("category", "created", {"id": category.id, "name": category.name})
    return category



async def update_category(category_id: int, data: CategoryUpdate, db: AsyncSession = None):
    service = CategoryService(db)
    category = await service.update(category_id, data)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await manager.broadcast_update("category", "updated", {"id": category.id, "name": category.name})
    return category



async def delete_category(category_id: int, db: AsyncSession = None):
    service = CategoryService(db)
    success = await service.delete(category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    await manager.broadcast_update("category", "deleted", {"id": category_id})
    return {"message": "Category deleted"}





