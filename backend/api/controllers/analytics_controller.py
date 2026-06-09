from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from backend.services.analytics_service import AnalyticsService

async def get_live_metrics(shop_id: Optional[int] = None, db: AsyncSession = None):
    service = AnalyticsService(db)
    return await service.get_live_metrics(shop_id=shop_id)

async def get_rfm_segmentation(shop_id: Optional[int] = None, db: AsyncSession = None):
    service = AnalyticsService(db)
    return await service.get_rfm_segmentation(shop_id=shop_id)

async def get_demand_forecast(shop_id: Optional[int] = None, db: AsyncSession = None):
    service = AnalyticsService(db)
    return await service.get_demand_forecast(shop_id=shop_id)

async def get_reorder_suggestions(shop_id: Optional[int] = None, db: AsyncSession = None):
    service = AnalyticsService(db)
    return await service.get_reorder_queue(shop_id=shop_id)

async def get_churn_risk(shop_id: Optional[int] = None, db: AsyncSession = None):
    service = AnalyticsService(db)
    return await service.get_churn_prediction(shop_id=shop_id)

async def get_product_affinity(shop_id: Optional[int] = None, db: AsyncSession = None):
    service = AnalyticsService(db)
    return await service.get_product_affinity(shop_id=shop_id)

async def get_customer_ltv(shop_id: Optional[int] = None, db: AsyncSession = None):
    service = AnalyticsService(db)
    return await service.get_ltv_projection(shop_id=shop_id)

async def get_sales_heatmap(shop_id: Optional[int] = None, db: AsyncSession = None):
    service = AnalyticsService(db)
    return await service.get_hourly_heatmap(shop_id=shop_id)

async def get_revenue_forecast(shop_id: Optional[int] = None, db: AsyncSession = None):
    service = AnalyticsService(db)
    return await service.get_revenue_forecast(shop_id=shop_id)
