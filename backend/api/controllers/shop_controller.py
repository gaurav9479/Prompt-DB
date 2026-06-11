from fastapi import APIRouter,  HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List


from backend.schemas.shop import (
    ShopCreate, ShopUpdate

)

from backend.services.product_service import ProductService, CategoryService
from backend.services.order_service import OrderService

from backend.services.shop_service import ShopService, ShopCategoryService

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}






async def list_shops(
    category_id: Optional[int] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = None
):

    service = ShopService(db)
    return await service.get_all(skip, limit, category_id, city, search)



async def get_shops_by_category(category_id: int, db: AsyncSession = None): 

    service = ShopService(db)
    return await service.get_by_category(category_id)



async def get_shop(shop_id: int, db: AsyncSession = None):
    service = ShopService(db)
    shop = await service.get_by_id(shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop



async def get_shop_dashboard(shop_id: int, db: AsyncSession = None):

    service = ShopService(db)
    shop = await service.get_by_id(shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return await service.get_dashboard_stats(shop_id)



async def get_shop_admin_stats(shop_id: int, db: AsyncSession = None):

    from sqlalchemy import select, func, and_
    from backend.models.shop import Shop
    from backend.models.order import Order
    from backend.models.product import Product
    from datetime import datetime, timedelta

    service = ShopService(db)
    shop = await service.get_by_id(shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    this_month = today.replace(day=1)
    last_month = (this_month - timedelta(days=1)).replace(day=1)


    overall_stats = await db.execute(
        select(
            func.sum(Order.total_amount).label("total_revenue"),
            func.sum(Order.total_cost).label("total_cost"),
            func.sum(Order.profit).label("total_profit"),
            func.sum(Order.discount_given).label("total_discount"),
            func.count(Order.id).label("order_count"),
            func.avg(Order.total_amount).label("avg_order_value")
        ).where(and_(Order.shop_id == shop_id, Order.status != "cancelled"))
    )
    overall = overall_stats.one()


    today_stats = await db.execute(
        select(
            func.sum(Order.total_amount).label("revenue"),
            func.sum(Order.profit).label("profit"),
            func.count(Order.id).label("orders")
        ).where(and_(Order.shop_id == shop_id, Order.status != "cancelled", Order.created_at >= today))
    )
    today_data = today_stats.one()


    month_stats = await db.execute(
        select(
            func.sum(Order.total_amount).label("revenue"),
            func.sum(Order.profit).label("profit"),
            func.count(Order.id).label("orders")
        ).where(and_(Order.shop_id == shop_id, Order.status != "cancelled", Order.created_at >= this_month))
    )
    month_data = month_stats.one()


    last_month_stats = await db.execute(
        select(
            func.sum(Order.total_amount).label("revenue"),
            func.sum(Order.profit).label("profit"),
            func.count(Order.id).label("orders")
        ).where(and_(
            Order.shop_id == shop_id,
            Order.status != "cancelled",
            Order.created_at >= last_month,
            Order.created_at < this_month
        ))
    )
    last_month_data = last_month_stats.one()


    product_stats = await db.execute(
        select(
            func.count(Product.id).label("total"),
            func.count(Product.id).filter(Product.is_active == True).label("active"),
            func.count(Product.id).filter(and_(Product.quantity <= Product.min_stock_level, Product.quantity > 0)).label("low_stock"),
            func.count(Product.id).filter(Product.quantity == 0).label("out_of_stock"),
            func.sum(Product.price * Product.quantity).label("inventory_value")
        ).where(Product.shop_id == shop_id)
    )
    products = product_stats.one()


    top_products = await db.execute(
        select(
            Order.product_name,
            func.sum(Order.quantity).label("units_sold"),
            func.sum(Order.total_amount).label("revenue"),
            func.sum(Order.profit).label("profit")
        ).where(and_(Order.shop_id == shop_id, Order.status != "cancelled"))
        .group_by(Order.product_name)
        .order_by(func.sum(Order.profit).desc())
        .limit(5)
    )
    top_products_list = [
        {
            "name": row.product_name,
            "units_sold": row.units_sold or 0,
            "revenue": round(row.revenue or 0, 2),
            "profit": round(row.profit or 0, 2)
        }
        for row in top_products.all()
    ]


    total_revenue = overall.total_revenue or 0
    total_cost = overall.total_cost or 0
    total_profit = overall.total_profit or 0
    profit_margin = round((total_profit / total_cost) * 100, 2) if total_cost > 0 else 0


    last_revenue = last_month_data.revenue or 0
    this_revenue = month_data.revenue or 0
    revenue_growth = round(((this_revenue - last_revenue) / last_revenue) * 100, 2) if last_revenue > 0 else 0


    cat_service = ShopCategoryService(db)
    category = await cat_service.get_by_id(shop.category_id) if shop.category_id else None

    return {
        "shop": {
            "id": shop.id,
            "name": shop.name,
            "description": shop.description,
            "category": category.name if category else None,
            "category_icon": category.icon if category else None,
            "owner_name": shop.owner_name,
            "owner_email": shop.owner_email,
            "owner_phone": shop.owner_phone,
            "address": shop.address,
            "city": shop.city,
            "pincode": shop.pincode,
            "rating": shop.rating,
            "is_active": shop.is_active,
            "is_verified": shop.is_verified,
            "created_at": shop.created_at
        },
        "financials": {
            "total_revenue": round(total_revenue, 2),
            "total_cost": round(total_cost, 2),
            "total_profit": round(total_profit, 2),
            "total_discount": round(overall.total_discount or 0, 2),
            "profit_margin": profit_margin,
            "avg_order_value": round(overall.avg_order_value or 0, 2)
        },
        "today": {
            "orders": today_data.orders or 0,
            "revenue": round(today_data.revenue or 0, 2),
            "profit": round(today_data.profit or 0, 2)
        },
        "this_month": {
            "orders": month_data.orders or 0,
            "revenue": round(this_revenue, 2),
            "profit": round(month_data.profit or 0, 2),
            "revenue_growth": revenue_growth
        },
        "last_month": {
            "orders": last_month_data.orders or 0,
            "revenue": round(last_revenue, 2),
            "profit": round(last_month_data.profit or 0, 2)
        },
        "products": {
            "total": products.total or 0,
            "active": products.active or 0,
            "low_stock": products.low_stock or 0,
            "out_of_stock": products.out_of_stock or 0,
            "inventory_value": round(products.inventory_value or 0, 2)
        },
        "top_products": top_products_list,
        "total_orders": overall.order_count or 0
    }



async def get_shop_products(
    shop_id: int,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
    db: AsyncSession = None
):

    product_service = ProductService(db)
    return await product_service.get_all(
        skip, limit, shop_id, category_id, search,
        not include_inactive, include_inactive
    )



async def get_shop_low_stock(shop_id: int, db: AsyncSession = None):

    product_service = ProductService(db)
    products = await product_service.get_low_stock(shop_id)
    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "quantity": p.quantity,
            "min_stock_level": p.min_stock_level
        }
        for p in products
    ]



async def get_shop_orders(
    shop_id: int,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = None
):

    order_service = OrderService(db)
    return await order_service.get_by_shop(shop_id, status, skip, limit)



async def create_shop(data: ShopCreate, db: AsyncSession = None):
    service = ShopService(db)
    shop = await service.create(data)
    return shop



async def update_shop(shop_id: int, data: ShopUpdate, db: AsyncSession = None):
    service = ShopService(db)
    shop = await service.update(shop_id, data)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop



async def delete_shop(shop_id: int, db: AsyncSession = None):
    service = ShopService(db)
    success = await service.delete(shop_id)
    if not success:
        raise HTTPException(status_code=404, detail="Shop not found")
    return {"message": "Shop deleted"}





async def get_shop_expiring_products(
    shop_id: int,
    days: int = 30,
    db: AsyncSession = None
):

    service = ProductService(db)
    products = await service.get_expiring_soon(days, shop_id)
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "quantity": p.quantity,
            "expiry_date": p.expiry_date,
            "days_until_expiry": p.days_until_expiry,
            "is_on_clearance": p.is_on_clearance,
            "clearance_price": p.clearance_price,
            "expiry_status": p.expiry_status
        }
        for p in products
    ]



async def get_shop_clearance_products(
    shop_id: int,
    db: AsyncSession = None
):

    service = ProductService(db)
    products = await service.get_clearance_products(shop_id)
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "original_price": p.price,
            "clearance_price": p.clearance_price,
            "discount_percent": p.clearance_discount,
            "quantity": p.quantity,
            "image_url": p.image_url,
            "in_stock": p.quantity > 0
        }
        for p in products
    ]



