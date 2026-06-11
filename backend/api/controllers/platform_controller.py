from fastapi import APIRouter,  HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.services.shop_service import ShopService
from backend.services.user_service import UserService

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}


async def get_platform_stats(db: AsyncSession = None):

    service = UserService(db)
    return await service.get_platform_stats()



async def get_all_platform_shops(
    is_verified: Optional[bool] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = None
):

    service = ShopService(db)
    shops = await service.get_all(skip, limit)

    if is_verified is not None:
        shops = [s for s in shops if s.is_verified == is_verified]
    if is_active is not None:
        shops = [s for s in shops if s.is_active == is_active]
    return shops



async def verify_shop(shop_id: int, db: AsyncSession = None):

    service = ShopService(db)
    shop = await service.get_by_id(shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop.is_verified = True
    await db.commit()
    await db.refresh(shop)
    return {"message": f"Shop '{shop.name}' has been verified", "shop_id": shop_id}



async def suspend_shop(shop_id: int, db: AsyncSession = None):

    service = ShopService(db)
    shop = await service.get_by_id(shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop.is_active = False
    await db.commit()
    await db.refresh(shop)
    return {"message": f"Shop '{shop.name}' has been suspended", "shop_id": shop_id}



async def activate_shop(shop_id: int, db: AsyncSession = None):

    service = ShopService(db)
    shop = await service.get_by_id(shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop.is_active = True
    await db.commit()
    await db.refresh(shop)
    return {"message": f"Shop '{shop.name}' has been activated", "shop_id": shop_id}





