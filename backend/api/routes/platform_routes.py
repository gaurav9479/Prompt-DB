from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}


from backend.api.controllers import platform_controller

router = APIRouter()

@router.get("/platform/stats")
async def get_platform_stats(db: AsyncSession = Depends(get_db)):
    return await platform_controller.get_platform_stats(db=db)

@router.get("/platform/shops")
async def get_all_platform_shops(
    is_verified: Optional[bool] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    return await platform_controller.get_all_platform_shops(is_verified=is_verified, is_active=is_active, skip=skip, limit=limit, db=db)

@router.patch("/platform/shops/{shop_id}/verify")
async def verify_shop(shop_id: int, db: AsyncSession = Depends(get_db)):
    return await platform_controller.verify_shop(shop_id=shop_id, db=db)

@router.patch("/platform/shops/{shop_id}/suspend")
async def suspend_shop(shop_id: int, db: AsyncSession = Depends(get_db)):
    return await platform_controller.suspend_shop(shop_id=shop_id, db=db)

@router.patch("/platform/shops/{shop_id}/activate")
async def activate_shop(shop_id: int, db: AsyncSession = Depends(get_db)):
    return await platform_controller.activate_shop(shop_id=shop_id, db=db)

