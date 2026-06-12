from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db
from backend.core.websocket import manager

from backend.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse


from backend.services.customer_service import CustomerService

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}





from sqlalchemy import select, func, and_
from backend.models.shop import Shop
from backend.models.order import Order
from backend.models.product import Product
from datetime import datetime, timedelta

async def list_customers(skip: int = 0, limit: int = 100, db: AsyncSession = None):
    service = CustomerService(db)
    return await service.get_all(skip, limit)



async def search_customers(query: str, db: AsyncSession = None):
    service = CustomerService(db)
    return await service.search(query)



async def get_customer(customer_id: int, db: AsyncSession = None):
    service = CustomerService(db)
    customer = await service.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer



async def create_customer(data: CustomerCreate, db: AsyncSession = None):
    service = CustomerService(db)
    existing = await service.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this email already exists")
    customer = await service.create(data)
    await manager.broadcast_update("customer", "created", {
        "id": customer.id, "name": customer.name, "email": customer.email
    })
    return customer



async def update_customer(customer_id: int, data: CustomerUpdate, db: AsyncSession = None):
    service = CustomerService(db)
    customer = await service.update(customer_id, data)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    await manager.broadcast_update("customer", "updated", {
        "id": customer.id, "name": customer.name, "email": customer.email
    })
    return customer



async def delete_customer(customer_id: int, db: AsyncSession = None):
    service = CustomerService(db)
    success = await service.delete(customer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Customer not found")
    await manager.broadcast_update("customer", "deleted", {"id": customer_id})
    return {"message": "Customer deleted"}





