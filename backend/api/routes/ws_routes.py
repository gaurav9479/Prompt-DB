from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}

from backend.api.controllers import ws_controller



@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    return await ws_controller.websocket_endpoint(websocket=websocket)

