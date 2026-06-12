from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
import logging

from typing import Optional, Dict, Any, List


from backend.core.websocket import manager

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}





from sqlalchemy import select, func, and_
from backend.models.shop import Shop
from backend.models.order import Order
from backend.models.product import Product
from datetime import datetime, timedelta

async def websocket_endpoint(websocket: WebSocket):
    try:
        await manager.connect(websocket)
    except Exception as e:
        logging.error(f"WebSocket connection error: {e}")
        # Send error message to client before closing
        await websocket.close(code=1011)
        return
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_personal_message({"type": "pong", "data": data}, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)





