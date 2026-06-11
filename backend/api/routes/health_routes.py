from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query

from typing import Optional, Dict, Any, List

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}

from backend.api.controllers import health_controller

router = APIRouter()

@router.get("/health")
async def health_check():
    return await health_controller.health_check()

