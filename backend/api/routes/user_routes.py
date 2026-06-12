from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from backend.core.database import get_db
from backend.schemas.user import UserResponse, UserCreate, UserUpdate
from backend.api.controllers import user_controller

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    return await user_controller.list_users(role=role, skip=skip, limit=limit, db=db)

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    return await user_controller.get_user(user_id=user_id, db=db)

@router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    return await user_controller.create_user(data=data, db=db)

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, data: UserUpdate, db: AsyncSession = Depends(get_db)):
    return await user_controller.update_user(user_id=user_id, data=data, db=db)

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    return await user_controller.delete_user(user_id=user_id, db=db)

