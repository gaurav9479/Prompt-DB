from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db

from backend.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}






from backend.api.controllers import customer_controller

router = APIRouter()

@router.get("/customers", response_model=List[CustomerResponse])
async def list_customers(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await customer_controller.list_customers(skip=skip, limit=limit, db=db)

@router.get("/customers/search/{query}")
async def search_customers(query: str, db: AsyncSession = Depends(get_db)):
    return await customer_controller.search_customers(query=query, db=db)

@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    return await customer_controller.get_customer(customer_id=customer_id, db=db)

@router.post("/customers", response_model=CustomerResponse)
async def create_customer(data: CustomerCreate, db: AsyncSession = Depends(get_db)):
    return await customer_controller.create_customer(data=data, db=db)

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: int, data: CustomerUpdate, db: AsyncSession = Depends(get_db)):
    return await customer_controller.update_customer(customer_id=customer_id, data=data, db=db)

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    return await customer_controller.delete_customer(customer_id=customer_id, db=db)

