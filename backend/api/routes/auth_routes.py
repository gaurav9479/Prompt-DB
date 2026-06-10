from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from backend.core.database import get_db
from backend.api.controllers import auth_controller
from backend.schemas.user import (
    UserLogin, LoginResponse, UserResponse, UserCreate,
    OwnerRegister, EmployeeRegister,
    OwnerProfileComplete, EmployeeProfileComplete,
    DBCredentialInput, ForgotPasswordRequest, ForgotPasswordResponse,
    VerifyResetTokenRequest, VerifyResetTokenResponse,
    ResetPasswordRequest, ResetPasswordResponse
)
from backend.security.jwt import get_current_user
from backend.models.user import User

router = APIRouter()

@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns the current authenticated user's fresh profile from the database."""
    return current_user

@router.post("/auth/login", response_model=LoginResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    return await auth_controller.login(data=data, db=db)

@router.post("/auth/register", response_model=UserResponse)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    return await auth_controller.register(data=data, db=db)

@router.post("/auth/register/owner")
async def register_owner(data: OwnerRegister, db: AsyncSession = Depends(get_db)):
    return await auth_controller.register_owner(data=data, db=db)

@router.post("/auth/register/employee")
async def register_employee(data: EmployeeRegister, db: AsyncSession = Depends(get_db)):
    return await auth_controller.register_employee(data=data, db=db)

@router.post("/profile/owner/complete", response_model=UserResponse)
async def complete_owner_profile(
    data: OwnerProfileComplete,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await auth_controller.complete_owner_profile(data=data, current_user=current_user, db=db)

@router.post("/profile/employee/complete", response_model=UserResponse)
async def complete_employee_profile(
    data: EmployeeProfileComplete,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await auth_controller.complete_employee_profile(data=data, current_user=current_user, db=db)

@router.put("/profile/db-credential")
async def update_db_credential(
    data: DBCredentialInput,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await auth_controller.update_db_credential(data=data, current_user=current_user, db=db)

@router.delete("/profile/db-credential")
async def delete_db_credential(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await auth_controller.delete_db_credential(current_user=current_user, db=db)

@router.get("/auth/company-code")
async def get_company_code(current_user: User = Depends(get_current_user)):
    return await auth_controller.get_company_code(current_user=current_user)

@router.post("/auth/company-code/regenerate")
async def regenerate_company_code(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await auth_controller.regenerate_company_code(current_user=current_user, db=db)

@router.post("/auth/validate-code")
async def validate_code(data: Dict[str, str], db: AsyncSession = Depends(get_db)):
    code = data.get("company_code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing company_code")
    return await auth_controller.validate_code(code=code, db=db)

@router.post("/auth/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    return await auth_controller.forgot_password(data=data, db=db)

@router.post("/auth/verify-reset-token", response_model=VerifyResetTokenResponse)
async def verify_reset_token(data: VerifyResetTokenRequest, db: AsyncSession = Depends(get_db)):
    return await auth_controller.verify_reset_token(data=data, db=db)

@router.post("/auth/reset-password", response_model=ResetPasswordResponse)
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    return await auth_controller.reset_password(data=data, db=db)
