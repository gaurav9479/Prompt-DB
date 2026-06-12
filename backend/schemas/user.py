from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from backend.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: str = UserRole.CUSTOMER.value


class UserCreate(UserBase):
    password: str
    shop_id: Optional[int] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    shop_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    shop_id: Optional[int] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    gst_number: Optional[str] = None
    shop_name: Optional[str] = None
    shop_type: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None
    business_description: Optional[str] = None
    operating_since: Optional[int] = None
    employee_count_range: Optional[str] = None
    db_connected: bool = False
    company_code: Optional[str] = None
    employer_id: Optional[int] = None
    profile_complete: bool = False
    profile_photo_url: Optional[str] = None
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None

    class Config:
        from_attributes = True


class UserWithShop(UserResponse):
    shop_name: Optional[str] = None


class LoginResponse(BaseModel):
    user: UserResponse
    token: Optional[str] = None
    message: str = "Login successful"


class ShopOwnerRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    shop_name: str
    shop_description: Optional[str] = None
    shop_category_id: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None


class OwnerRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    gst_number: str
    shop_name: str
    shop_type: str
    address_line1: str
    city: str
    state: str
    pincode: str


class EmployeeRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    company_code: str


class OwnerProfileComplete(BaseModel):
    profile_photo_url: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account_name: str
    bank_account_number: str
    ifsc_code: str
    upi_id: Optional[str] = None
    business_description: Optional[str] = None
    operating_since: Optional[int] = None
    employee_count_range: Optional[str] = None


class EmployeeProfileComplete(BaseModel):
    profile_photo_url: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    home_address: Optional[str] = None
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    branch_name: str
    branch_address: str
    branch_type: str


class DBCredentialInput(BaseModel):
    connection_string: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: Optional[str] = None  


class VerifyResetTokenRequest(BaseModel):
    token: str


class VerifyResetTokenResponse(BaseModel):
    valid: bool
    email: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ResetPasswordResponse(BaseModel):
    success: bool
    message: str
