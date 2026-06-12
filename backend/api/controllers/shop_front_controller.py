from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db
from backend.core.websocket import manager
from backend.schemas.command import CommandInput, CommandResponse, ParsedIntent, MultiStepPlan



from backend.services.product_service import ProductService, CategoryService

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}


async def shop_list_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = None
):

    service = ProductService(db)
    products = await service.get_all(skip, limit, category_id, search, active_only=True)
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "brand": p.brand,
            "price": p.price,
            "compare_at_price": p.compare_at_price,
            "image_url": p.image_url,
            "category_id": p.category_id,
            "in_stock": p.quantity > 0,
            "unit": p.unit
        }
        for p in products
    ]



async def shop_list_categories(db: AsyncSession = None):

    service = CategoryService(db)
    return await service.get_with_product_count()



async def shop_get_product(product_id: int, db: AsyncSession = None):

    service = ProductService(db)
    product = await service.get_by_id(product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    await service.increment_view(product_id)

    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "brand": product.brand,
        "price": product.price,
        "compare_at_price": product.compare_at_price,
        "image_url": product.image_url,
        "images": product.images,
        "category_id": product.category_id,
        "in_stock": product.quantity > 0,
        "unit": product.unit,
        "tags": product.tags
    }





