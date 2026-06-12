from typing import Dict, Any, Optional, List
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, and_

from backend.models.order import Order, OrderStatus
from backend.models.product import Product
from backend.models.shop import Shop
from backend.models.customer import Customer


class BillingService:
    """Service for handling billing with dynamic pricing and profit tracking"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_order_with_pricing(
        self,
        product_id: int,
        quantity: int,
        customer_name: str,
        customer_email: Optional[str] = None,
        customer_phone: Optional[str] = None,
        delivery_address: Optional[str] = None,
        selling_price: Optional[float] = None, 
        shop_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        result = await self.db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            return {"success": False, "error": "Product not found"}

        if product.quantity < quantity:
            return {"success": False, "error": f"Insufficient stock. Available: {product.quantity}"}

        cost_price = product.cost_price or 0
        listed_price = product.price  
        final_price = selling_price if selling_price else listed_price

        if product.min_price and final_price < product.min_price:
            return {
                "success": False,
                "error": f"Price ₹{final_price} is below minimum acceptable price ₹{product.min_price}",
                "min_price": product.min_price
            }

        if cost_price > 0 and final_price < cost_price:
            return {
                "success": False,
                "error": f"Warning: Selling at ₹{final_price} will result in loss of ₹{cost_price - final_price} per unit",
                "requires_confirmation": True,
                "loss_per_unit": cost_price - final_price
            }

        total_amount = final_price * quantity
        total_cost = cost_price * quantity if cost_price else None
        profit = total_amount - total_cost if total_cost else None
        discount_given = (listed_price - final_price) * quantity

        order = Order(
            shop_id=shop_id or product.shop_id,
            product_id=product_id,
            product_name=product.name,
            quantity=quantity,
            cost_price=cost_price if cost_price else None,
            listed_price=listed_price,
            final_price=final_price,
            unit_price=final_price,
            total_amount=total_amount,
            total_cost=total_cost,
            profit=profit,
            discount_given=discount_given,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            delivery_address=delivery_address,
            status=OrderStatus.PENDING.value,
        )

        product.quantity -= quantity
        product.sold_count += quantity

        # Update Shop stats
        shop_res = await self.db.execute(select(Shop).where(Shop.id == (shop_id or product.shop_id)))
        shop = shop_res.scalar_one_or_none()
        if shop:
            shop.total_orders = (shop.total_orders or 0) + 1
            shop.total_revenue = (shop.total_revenue or 0.0) + total_amount

        # Resolve or create Customer
        customer = None
        if customer_email:
            cust_res = await self.db.execute(select(Customer).where(Customer.email == customer_email))
            customer = cust_res.scalar_one_or_none()
        if not customer and customer_phone:
            cust_res = await self.db.execute(select(Customer).where(Customer.phone == customer_phone))
            customer = cust_res.scalar_one_or_none()

        if not customer:
            email = customer_email or f"{customer_name.lower().replace(' ', '.')}@promptdb.com"
            cust_res = await self.db.execute(select(Customer).where(Customer.email == email))
            existing = cust_res.scalar_one_or_none()
            if existing:
                customer = existing
            else:
                customer = Customer(
                    name=customer_name,
                    email=email,
                    phone=customer_phone,
                    address=delivery_address,
                    is_active=True
                )
                self.db.add(customer)
                await self.db.flush()

        if customer:
            customer.total_orders = (customer.total_orders or 0) + 1
            customer.total_spent = (customer.total_spent or 0.0) + total_amount
            order.customer_id = customer.id

        self.db.add(order)
        await self.db.commit()
        await self.db.refresh(order)

        return {
            "success": True,
            "order": order,
            "profit_info": {
                "cost_price": cost_price,
                "listed_price": listed_price,
                "sold_at": final_price,
                "profit": profit,
                "discount_given": discount_given,
            }
        }

    async def generate_customer_bill(self, order_id: int) -> Dict[str, Any]:
        res = await self.db.execute(select(Order).where(Order.id == order_id))
        order = res.scalar_one_or_none()
        if not order:
            return {"success": False, "error": "Order not found"}

        shop_res = await self.db.execute(select(Shop).where(Shop.id == order.shop_id))
        shop = shop_res.scalar_one_or_none()
        shop_name = shop.name if shop else "Shop"

        bill = {
            "bill_type": "customer",
            "order_id": order.id,
            "shop_name": shop_name,
            "date": order.created_at.strftime("%Y-%m-%d %H:%M") if order.created_at else "",
            "items": [
                {
                    "name": order.product_name,
                    "quantity": order.quantity,
                    "unit_price": order.unit_price,
                    "total": order.total_amount,
                }
            ],
            "subtotal": order.total_amount,
            "tax": 0,  
            "grand_total": order.total_amount,
            "customer": {
                "name": order.customer_name,
                "phone": order.customer_phone,
                "email": order.customer_email,
            },
            "status": order.status,
        }

        return {"success": True, "bill": bill}

    async def generate_admin_bill(self, order_id: int) -> Dict[str, Any]:
        res = await self.db.execute(select(Order).where(Order.id == order_id))
        order = res.scalar_one_or_none()
        if not order:
            return {"success": False, "error": "Order not found"}

        shop_res = await self.db.execute(select(Shop).where(Shop.id == order.shop_id))
        shop = shop_res.scalar_one_or_none()
        shop_name = shop.name if shop else "Shop"

        profit_margin = 0
        if order.total_cost and order.total_cost > 0:
            profit_margin = round(((order.profit or 0) / order.total_cost) * 100, 2)

        bill = {
            "bill_type": "admin",
            "order_id": order.id,
            "shop_name": shop_name,
            "date": order.created_at.strftime("%Y-%m-%d %H:%M") if order.created_at else "",
            "items": [
                {
                    "name": order.product_name,
                    "quantity": order.quantity,
                    "cost_price": order.cost_price,
                    "mrp": order.listed_price,
                    "sold_at": order.final_price,
                    "total_cost": order.total_cost,
                    "total_revenue": order.total_amount,
                    "profit": order.profit,
                }
            ],
            "summary": {
                "subtotal": order.total_amount,
                "total_cost": order.total_cost,
                "total_profit": order.profit,
                "discount_given": order.discount_given,
                "profit_margin_percent": profit_margin,
            },
            "customer": {
                "name": order.customer_name,
                "phone": order.customer_phone,
                "email": order.customer_email,
            },
            "status": order.status,
        }

        return {"success": True, "bill": bill}

    async def get_daily_profit_report(
        self, shop_id: int, report_date: Optional[date] = None
    ) -> Dict[str, Any]:
        if not report_date:
            report_date = date.today()

        res = await self.db.execute(
            select(Order)
            .where(
                and_(
                    Order.shop_id == shop_id,
                    func.date(Order.created_at) == report_date,
                    Order.status != OrderStatus.CANCELLED.value,
                )
            )
        )
        orders = list(res.scalars().all())

        total_revenue = sum(o.total_amount for o in orders)
        total_cost = sum(o.total_cost or 0 for o in orders)
        total_profit = sum(o.profit or 0 for o in orders)
        total_discount = sum(o.discount_given or 0 for o in orders)

        avg_margin = 0
        if total_cost > 0:
            avg_margin = round((total_profit / total_cost) * 100, 2)

        return {
            "success": True,
            "report": {
                "date": report_date.strftime("%Y-%m-%d"),
                "total_orders": len(orders),
                "total_revenue": round(total_revenue, 2),
                "total_cost": round(total_cost, 2),
                "total_profit": round(total_profit, 2),
                "total_discount_given": round(total_discount, 2),
                "avg_profit_margin": avg_margin,
            }
        }

    async def get_product_profit_report(self, shop_id: int) -> Dict[str, Any]:
        res = await self.db.execute(
            select(
                Order.product_id,
                Order.product_name,
                func.sum(Order.quantity).label("units_sold"),
                func.sum(Order.total_amount).label("total_revenue"),
                func.sum(Order.total_cost).label("total_cost"),
                func.sum(Order.profit).label("total_profit"),
            )
            .where(
                and_(
                    Order.shop_id == shop_id,
                    Order.status != OrderStatus.CANCELLED.value,
                )
            )
            .group_by(Order.product_id, Order.product_name)
        )
        results = res.all()

        products = []
        for r in results:
            units = r.units_sold or 0
            revenue = r.total_revenue or 0
            profit = r.total_profit or 0

            products.append({
                "product_id": r.product_id,
                "product_name": r.product_name,
                "units_sold": units,
                "total_revenue": round(revenue, 2),
                "total_cost": round(r.total_cost or 0, 2),
                "total_profit": round(profit, 2),
                "avg_selling_price": round(revenue / units, 2) if units > 0 else 0,
                "avg_profit_per_unit": round(profit / units, 2) if units > 0 else 0,
            })

        products.sort(key=lambda x: x["total_profit"], reverse=True)

        return {"success": True, "products": products}

    async def sell_at_price(
        self,
        product_id: int,
        selling_price: float,
        quantity: int,
        customer_name: str,
        customer_phone: Optional[str] = None,
        force: bool = False, 
    ) -> Dict[str, Any]:
        res = await self.db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = res.scalar_one_or_none()
        if not product:
            return {"success": False, "error": "Product not found"}

        cost_price = product.cost_price or 0

        if product.min_price and selling_price < product.min_price and not force:
            return {
                "success": False,
                "error": f"Price ₹{selling_price} is below minimum ₹{product.min_price}",
                "requires_confirmation": True,
                "confirmation_type": "below_min_price",
            }

        if cost_price > 0 and selling_price < cost_price and not force:
            loss = cost_price - selling_price
            return {
                "success": False,
                "error": f"Selling at ₹{selling_price} results in loss of ₹{loss}/unit",
                "requires_confirmation": True,
                "confirmation_type": "selling_at_loss",
                "loss_per_unit": loss,
            }

        return await self.create_order_with_pricing(
            product_id=product_id,
            quantity=quantity,
            customer_name=customer_name,
            customer_phone=customer_phone,
            selling_price=selling_price,
        )

    async def get_shop_profit_summary(self, shop_id: int) -> Dict[str, Any]:
        res = await self.db.execute(
            select(Order)
            .where(
                and_(
                    Order.shop_id == shop_id,
                    Order.status != OrderStatus.CANCELLED.value,
                )
            )
        )
        all_orders = list(res.scalars().all())

        today = date.today()
        today_orders = [
            o for o in all_orders
            if o.created_at.date() == today if o.created_at
        ]

        def calc_stats(orders):
            revenue = sum(o.total_amount for o in orders)
            cost = sum(o.total_cost or 0 for o in orders)
            profit = sum(o.profit or 0 for o in orders)
            discount = sum(o.discount_given or 0 for o in orders)
            margin = round((profit / cost) * 100, 2) if cost > 0 else 0
            return {
                "orders": len(orders),
                "revenue": round(revenue, 2),
                "cost": round(cost, 2),
                "profit": round(profit, 2),
                "discount_given": round(discount, 2),
                "margin_percent": margin,
            }

        return {
            "success": True,
            "summary": {
                "today": calc_stats(today_orders),
                "all_time": calc_stats(all_orders),
            }
        }
