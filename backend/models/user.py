from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
import enum

from backend.core.database import Base


class UserRole(enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"   
    CUSTOMER = "customer"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=True)

    role = Column(String(20), default=UserRole.CUSTOMER.value, index=True)

    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True)

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    reset_token = Column(String(100), nullable=True, index=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Super Admin & Admin Onboarding Fields
    gst_number = Column(String(15), nullable=True)
    shop_name = Column(String(255), nullable=True)
    shop_type = Column(String(50), nullable=True)
    address_line1 = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    pan_number = Column(String(10), nullable=True)
    bank_account_name = Column(String(255), nullable=True)
    bank_account_number = Column(String(30), nullable=True)
    ifsc_code = Column(String(11), nullable=True)
    upi_id = Column(String(100), nullable=True)
    business_description = Column(Text, nullable=True)
    operating_since = Column(Integer, nullable=True)
    employee_count_range = Column(String(20), nullable=True)
    encrypted_db_string = Column(Text, nullable=True)  # Fernet encrypted
    db_connected = Column(Boolean, default=False)
    company_code = Column(String(10), nullable=True)  # SHOP-XXXX
    employer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    profile_complete = Column(Boolean, default=False)
    profile_photo_url = Column(Text, nullable=True)
    id_proof_type = Column(String(30), nullable=True)
    id_proof_number = Column(String(50), nullable=True)

    shop = relationship("Shop", back_populates="owner")
    employer = relationship("User", remote_side=[id], backref=backref("employees", cascade="all, delete-orphan"))

    @property
    def is_super_admin(self):
        return self.role == UserRole.SUPER_ADMIN.value

    @property
    def is_shop_owner(self):
        return self.role == UserRole.ADMIN.value

    @property
    def is_customer(self):
        return self.role == UserRole.CUSTOMER.value
