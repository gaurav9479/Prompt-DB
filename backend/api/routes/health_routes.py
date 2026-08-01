from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.services.command_suggestions import CommandSuggestionService
from backend.core.database import get_db
from backend.api.controllers import health_controller

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    return await health_controller.health_check(db)
