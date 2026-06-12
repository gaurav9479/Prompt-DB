from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db

from backend.schemas.order import OrderCreate, OrderUpdate, OrderResponse

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()


session_context: Dict[str, Any] = {}





from sqlalchemy import select, func, and_
from backend.models.shop import Shop
from backend.models.order import Order
from backend.models.product import Product
from datetime import datetime, timedelta

from backend.api.controllers import order_controller

router = APIRouter()

@router.get("/orders", response_model=List[OrderResponse])
async def list_orders(
    status: Optional[str] = None,
    customer_email: Optional[str] = None,
    shop_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    return await order_controller.list_orders(
        status=status, customer_email=customer_email, shop_id=shop_id, skip=skip, limit=limit, db=db
    )

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    return await order_controller.get_order(order_id=order_id, db=db)

@router.get("/orders/{order_id}/invoice")
async def get_order_invoice(order_id: int, db: AsyncSession = Depends(get_db)):
    import io
    from sqlalchemy.orm import selectinload
    from fastapi.responses import StreamingResponse
    from backend.services.invoice_service import generate_invoice_pdf

    result = await db.execute(
        select(Order).options(selectinload(Order.shop)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    pdf_bytes = generate_invoice_pdf(order)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_INV-{order.id:06d}.pdf"}
    )


@router.post("/orders", response_model=OrderResponse)
async def create_order(data: OrderCreate, db: AsyncSession = Depends(get_db)):
    return await order_controller.create_order(data=data, db=db)

@router.put("/orders/{order_id}", response_model=OrderResponse)
async def update_order(order_id: int, data: OrderUpdate, db: AsyncSession = Depends(get_db)):
    return await order_controller.update_order(order_id=order_id, data=data, db=db)

@router.post("/orders/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(order_id: int, db: AsyncSession = Depends(get_db)):
    return await order_controller.cancel_order(order_id=order_id, db=db)

