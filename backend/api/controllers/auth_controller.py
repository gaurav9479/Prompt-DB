import secrets
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Dict, Any

from backend.models.user import User, UserRole
from backend.models.branch import Branch
from backend.services.user_service import UserService
from backend.schemas.user import (
    UserLogin, LoginResponse, UserResponse,
    OwnerRegister, EmployeeRegister,
    OwnerProfileComplete, EmployeeProfileComplete,
    DBCredentialInput
)
from backend.security.jwt import create_access_token
from backend.security.db_credential import encrypt_credential


async def login(data: UserLogin, db: AsyncSession = None):
    service = UserService(db)
    user = await service.authenticate(data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"user_id": user.id, "email": user.email, "role": user.role})
    return LoginResponse(user=user, token=token, message="Login successful")


async def register(data: Any, db: AsyncSession = None):
    # Fallback default register for customers
    service = UserService(db)
    existing = await service.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    data.role = UserRole.CUSTOMER.value
    user = await service.create(data)
    return user


async def register_owner(data: OwnerRegister, db: AsyncSession = None):
    user_service = UserService(db)
    existing = await user_service.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate unique company code
    company_code = f"SHOP-{secrets.token_hex(2).upper()}"
    while True:
        code_res = await db.execute(select(User).where(User.company_code == company_code))
        if not code_res.first():
            break
        company_code = f"SHOP-{secrets.token_hex(2).upper()}"

    # Create Super Admin Owner
    hashed_pwd = user_service._hash_password(data.password)
    user = User(
        email=data.email,
        password_hash=hashed_pwd,
        name=data.name,
        phone=data.phone,
        role=UserRole.SUPER_ADMIN.value,
        gst_number=data.gst_number,
        shop_name=data.shop_name,
        shop_type=data.shop_type,
        address_line1=data.address_line1,
        city=data.city,
        state=data.state,
        pincode=data.pincode,
        company_code=company_code,
        profile_complete=False,
        is_active=True,
        is_verified=True
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"user_id": user.id, "email": user.email, "role": user.role})
    return {
        "user": user,
        "token": token,
        "message": "Shop owner registered successfully. Please complete your profile."
    }


async def register_employee(data: EmployeeRegister, db: AsyncSession = None):
    user_service = UserService(db)
    existing = await user_service.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Look up superadmin by company code
    super_admin_res = await db.execute(select(User).where(User.company_code == data.company_code))
    super_admin = super_admin_res.scalar_one_or_none()
    if not super_admin:
        raise HTTPException(status_code=400, detail="Invalid company code. Ask your employer for the correct code.")

    hashed_pwd = user_service._hash_password(data.password)
    user = User(
        email=data.email,
        password_hash=hashed_pwd,
        name=data.name,
        phone=data.phone,
        role=UserRole.ADMIN.value,
        employer_id=super_admin.id,
        shop_id=super_admin.shop_id,
        profile_complete=False,
        is_active=True,
        is_verified=True
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"user_id": user.id, "email": user.email, "role": user.role})
    return {
        "user": user,
        "token": token,
        "message": "Employee registered successfully. Please complete your profile."
    }


async def complete_owner_profile(data: OwnerProfileComplete, current_user: User, db: AsyncSession = None):
    if current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Shop Owners can complete owner profiles")

    current_user.pan_number = data.pan_number
    current_user.bank_account_name = data.bank_account_name
    current_user.bank_account_number = data.bank_account_number
    current_user.ifsc_code = data.ifsc_code
    current_user.upi_id = data.upi_id
    current_user.business_description = data.business_description
    current_user.operating_since = data.operating_since
    current_user.employee_count_range = data.employee_count_range
    current_user.profile_photo_url = data.profile_photo_url
    current_user.profile_complete = True

    await db.commit()
    await db.refresh(current_user)
    return current_user


async def complete_employee_profile(data: EmployeeProfileComplete, current_user: User, db: AsyncSession = None):
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Employees can complete admin profiles")

    current_user.profile_photo_url = data.profile_photo_url
    current_user.id_proof_type = data.id_proof_type
    current_user.id_proof_number = data.id_proof_number
    current_user.profile_complete = True

    # Create Branch
    branch = Branch(
        name=data.branch_name,
        address=data.branch_address,
        branch_type=data.branch_type,
        admin_id=current_user.id,
        owner_id=current_user.employer_id
    )

    db.add(branch)
    await db.commit()
    await db.refresh(current_user)
    return current_user


async def update_db_credential(data: DBCredentialInput, current_user: User, db: AsyncSession = None):
    if current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Shop Owners can update DB credentials")

    encrypted = encrypt_credential(data.connection_string)
    current_user.encrypted_db_string = encrypted
    current_user.db_connected = True

    await db.commit()
    return {"message": "Database connection saved securely", "db_connected": True}


async def delete_db_credential(current_user: User, db: AsyncSession = None):
    if current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Shop Owners can remove DB credentials")

    current_user.encrypted_db_string = None
    current_user.db_connected = False

    await db.commit()
    return {"message": "Database credential removed successfully", "db_connected": False}


async def get_company_code(current_user: User):
    if current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Shop Owners can access the company code")
    return {"company_code": current_user.company_code}


async def regenerate_company_code(current_user: User, db: AsyncSession = None):
    if current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Shop Owners can regenerate the company code")

    company_code = f"SHOP-{secrets.token_hex(2).upper()}"
    while True:
        code_res = await db.execute(select(User).where(User.company_code == company_code))
        if not code_res.first():
            break
        company_code = f"SHOP-{secrets.token_hex(2).upper()}"

    current_user.company_code = company_code
    await db.commit()
    await db.refresh(current_user)
    return {"company_code": company_code, "message": "Company code regenerated successfully"}


async def validate_code(code: str, db: AsyncSession = None):
    res = await db.execute(select(User).where(User.company_code == code))
    owner = res.scalar_one_or_none()
    if not owner:
        return {"valid": False, "message": "Invalid company code"}
    return {"valid": True, "shop_name": owner.shop_name or owner.name}


# Forgot password / reset flow fallbacks
async def forgot_password(data: Any, db: AsyncSession = None):
    service = UserService(db)
    token = await service.generate_reset_token(data.email)
    if not token:
        return {"message": "If an account with this email exists, a reset link has been sent.", "reset_token": None}
    return {"message": "Password reset link generated.", "reset_token": token}


async def verify_reset_token(data: Any, db: AsyncSession = None):
    service = UserService(db)
    user = await service.verify_reset_token(data.token)
    if not user:
        return {"valid": False, "email": None}
    email = user.email
    masked_email = email[0:2] + "***" + email[email.index("@"):]
    return {"valid": True, "email": masked_email}


async def reset_password(data: Any, db: AsyncSession = None):
    service = UserService(db)
    success = await service.reset_password(data.token, data.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return {"success": True, "message": "Password reset successful"}
