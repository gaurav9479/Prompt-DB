from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db
from backend.core.websocket import manager
from backend.schemas.command import CommandInput, CommandResponse
from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}


from backend.api.controllers import command_controller

router = APIRouter()

@router.post("/command", response_model=CommandResponse)
async def execute_command(
    command: CommandInput,
    db: AsyncSession = Depends(get_db)
):
    return await command_controller.execute_command(command=command, db=db)

@router.post("/command/confirm/{confirmation_id}", response_model=CommandResponse)
async def confirm_command(confirmation_id: str, db: AsyncSession = Depends(get_db)):
    return await command_controller.confirm_command(confirmation_id=confirmation_id, db=db)

@router.get("/command/suggestions")
async def get_command_suggestions(
    query: str = "",
    role: str = "customer",
    limit: int = 5
):
    return await command_controller.get_command_suggestions(query=query, role=role, limit=limit)

@router.get("/command/all")
async def get_all_commands(role: str = "customer"):
    return await command_controller.get_all_commands(role=role)

@router.get("/command/quick-actions")
async def get_quick_actions(role: str = "customer"):
    return await command_controller.get_quick_actions(role=role)

@router.get("/command/help/{command}")
async def get_command_help(command: str):
    return await command_controller.get_command_help(command=command)

@router.get("/command/logs/customer/{user_id}")
async def get_customer_logs(user_id: int, db: AsyncSession = Depends(get_db)):
    return await command_controller.get_customer_logs(user_id=user_id, db=db)

@router.get("/command/logs/shop/{shop_id}")
async def get_shop_logs(shop_id: int, db: AsyncSession = Depends(get_db)):
    return await command_controller.get_shop_logs(shop_id=shop_id, db=db)

