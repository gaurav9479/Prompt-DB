import hmac
import hashlib
import json
import base64
import time
import os
from fastapi import Header, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.models.user import User

SECRET_KEY = os.environ.get("FERNET_SECRET_KEY", "default-jwt-secret-key-1234567890")

def create_access_token(data: dict, expires_in: int = 86400) -> str:
    payload = {
        "data": data,
        "exp": int(time.time()) + expires_in
    }
    payload_str = json.dumps(payload)
    payload_b64 = base64.urlsafe_b64encode(payload_str.encode()).decode().rstrip("=")
    
    signature = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"
    
def decode_access_token(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        
        expected_sig = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
            
        missing_padding = len(payload_b64) % 4
        if missing_padding:
            payload_b64 += "=" * (4 - missing_padding)
        payload_str = base64.urlsafe_b64decode(payload_b64.encode()).decode()
        payload = json.loads(payload_str)
        
        if payload.get("exp", 0) < time.time():
            return None
            
        return payload.get("data")
    except Exception:
        return None

async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
        
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid token scheme")
            
        token = authorization.split(" ")[1]
        data = decode_access_token(token)
        if not data or "user_id" not in data:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
            
        user_id = data["user_id"]
        from backend.services.user_service import UserService
        service = UserService(db)
        user = await service.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
