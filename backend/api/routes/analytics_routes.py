from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any

from backend.core.database import get_db
from backend.api.controllers import analytics_controller

router = APIRouter()

@router.get("/analytics/live")
async def get_live_metrics(shop_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_live_metrics(shop_id=shop_id, db=db)

@router.get("/analytics/rfm")
async def get_rfm_segmentation(shop_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_rfm_segmentation(shop_id=shop_id, db=db)

@router.get("/analytics/demand-forecast")
async def get_demand_forecast(shop_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_demand_forecast(shop_id=shop_id, db=db)

@router.get("/analytics/reorder-suggestions")
async def get_reorder_suggestions(shop_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_reorder_suggestions(shop_id=shop_id, db=db)

@router.get("/analytics/churn-risk")
async def get_churn_risk(shop_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_churn_risk(shop_id=shop_id, db=db)

@router.get("/analytics/product-affinity")
async def get_product_affinity(shop_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_product_affinity(shop_id=shop_id, db=db)

@router.get("/analytics/customer-ltv")
async def get_customer_ltv(shop_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_customer_ltv(shop_id=shop_id, db=db)

@router.get("/analytics/sales-heatmap")
async def get_sales_heatmap(shop_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_sales_heatmap(shop_id=shop_id, db=db)

@router.get("/analytics/revenue-forecast")
async def get_revenue_forecast(shop_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    return await analytics_controller.get_revenue_forecast(shop_id=shop_id, db=db)
