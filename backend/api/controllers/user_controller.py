from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List
from backend.services.user_service import UserService
from backend.schemas.user import (
    UserCreate, UserUpdate

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

async def list_users(
    role: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = None
):

    service = UserService(db)
    return await service.get_all(role, skip, limit)



async def get_user(user_id: int, db: AsyncSession = None):
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user



async def create_user(data: UserCreate, db: AsyncSession = None):

    service = UserService(db)
    existing = await service.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await service.create(data)
    return user



async def update_user(user_id: int, data: UserUpdate, db: AsyncSession = None):
    service = UserService(db)
    user = await service.update(user_id, data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user



async def delete_user(user_id: int, db: AsyncSession = None):
    service = UserService(db)
    success = await service.delete(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}





