from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.schemas.shop import (

    ShopCategoryCreate, ShopCategoryUpdate, ShopCategoryResponse
)

from backend.services.shop_service import ShopService, ShopCategoryService

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}





from sqlalchemy import select, func, and_
from backend.models.shop import Shop
from backend.models.order import Order
from backend.models.product import Product
from datetime import datetime, timedelta

async def list_shop_categories(db: AsyncSession = None):

    service = ShopCategoryService(db)
    return await service.get_all()



async def list_shop_categories_with_counts(db: AsyncSession = None):

    service = ShopCategoryService(db)
    return await service.get_with_shop_count()



async def get_shop_category(category_id: int, db: AsyncSession = None):
    service = ShopCategoryService(db)
    category = await service.get_by_id(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Shop category not found")
    return category



async def get_category_shops_with_stats(category_id: int, db: AsyncSession = None):

    shop_service = ShopService(db)
    cat_service = ShopCategoryService(db)

    category = await cat_service.get_by_id(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Shop category not found")


    from sqlalchemy import select
    from backend.models.shop import Shop
    from backend.models.order import Order
    from sqlalchemy import func, and_

    result = await db.execute(
        select(Shop).where(Shop.category_id == category_id).order_by(Shop.total_revenue.desc())
    )
    shops = list(result.scalars().all())

    shops_with_stats = []
    for shop in shops:

        profit_result = await db.execute(
            select(
                func.sum(Order.total_amount).label("total_revenue"),
                func.sum(Order.total_cost).label("total_cost"),
                func.sum(Order.profit).label("total_profit"),
                func.count(Order.id).label("order_count")
            ).where(and_(Order.shop_id == shop.id, Order.status != "cancelled"))
        )
        profit_stats = profit_result.one()

        total_revenue = profit_stats.total_revenue or 0
        total_cost = profit_stats.total_cost or 0
        total_profit = profit_stats.total_profit or 0
        order_count = profit_stats.order_count or 0

        profit_margin = round((total_profit / total_cost) * 100, 2) if total_cost > 0 else 0

        shops_with_stats.append({
            "id": shop.id,
            "name": shop.name,
            "description": shop.description,
            "owner_name": shop.owner_name,
            "owner_email": shop.owner_email,
            "owner_phone": shop.owner_phone,
            "address": shop.address,
            "city": shop.city,
            "pincode": shop.pincode,
            "rating": shop.rating,
            "is_active": shop.is_active,
            "is_verified": shop.is_verified,
            "created_at": shop.created_at,
            "stats": {
                "total_orders": order_count,
                "total_revenue": round(total_revenue, 2),
                "total_cost": round(total_cost, 2),
                "total_profit": round(total_profit, 2),
                "profit_margin": profit_margin
            }
        })

    return {
        "category": {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "icon": category.icon
        },
        "total_shops": len(shops),
        "active_shops": len([s for s in shops if s.is_active]),
        "verified_shops": len([s for s in shops if s.is_verified]),
        "shops": shops_with_stats
    }



async def create_shop_category(data: ShopCategoryCreate, db: AsyncSession = None):
    service = ShopCategoryService(db)
    category = await service.create(data)
    return category



async def update_shop_category(category_id: int, data: ShopCategoryUpdate, db: AsyncSession = None):
    service = ShopCategoryService(db)
    category = await service.update(category_id, data)
    if not category:
        raise HTTPException(status_code=404, detail="Shop category not found")
    return category



async def delete_shop_category(category_id: int, db: AsyncSession = None):
    service = ShopCategoryService(db)
    success = await service.delete(category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Shop category not found")
    return {"message": "Shop category deleted"}





