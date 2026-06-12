from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List

from backend.models.order import Order, OrderStatus
from backend.models.product import Product
from backend.models.shop import Shop
from backend.models.customer import Customer
from backend.schemas.order import OrderCreate, OrderUpdate


class OrderService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: OrderCreate) -> Optional[Order]:
        result = await self.db.execute(
            select(Product).where(Product.id == data.product_id)
        )
        product = result.scalar_one_or_none()

        if not product:
            return None


        unit_price = data.selling_price if data.selling_price is not None else product.price
        listed_price = product.price
        final_price = unit_price
        cost_price = product.cost_price

        total_amount = unit_price * data.quantity
        total_cost = (cost_price or 0.0) * data.quantity
        profit = total_amount - total_cost
        discount_given = max(0.0, (listed_price - final_price) * data.quantity)


        product.quantity = max(0, product.quantity - data.quantity)
        product.sold_count = (product.sold_count or 0) + data.quantity


        customer = None
        if data.customer_email:
            cust_res = await self.db.execute(select(Customer).where(Customer.email == data.customer_email))
            customer = cust_res.scalar_one_or_none()

        if not customer and data.customer_phone:
            cust_res = await self.db.execute(select(Customer).where(Customer.phone == data.customer_phone))
            customer = cust_res.scalar_one_or_none()

        if not customer:
            email = data.customer_email or f"{data.customer_name.lower().replace(' ', '.')}@promptdb.com"
            cust_res = await self.db.execute(select(Customer).where(Customer.email == email))
            existing = cust_res.scalar_one_or_none()
            if existing:
                customer = existing
            else:
                customer = Customer(
                    name=data.customer_name,
                    email=email,
                    phone=data.customer_phone,
                    address=data.delivery_address,
                    is_active=True
                )
                self.db.add(customer)
                await self.db.flush()


        if customer:
            customer.total_orders = (customer.total_orders or 0) + 1
            customer.total_spent = (customer.total_spent or 0.0) + total_amount
            if data.customer_phone and not customer.phone:
                customer.phone = data.customer_phone
            if data.delivery_address and not customer.address:
                customer.address = data.delivery_address


        shop_result = await self.db.execute(select(Shop).where(Shop.id == product.shop_id))
        shop = shop_result.scalar_one_or_none()
        if shop:
            shop.total_orders = (shop.total_orders or 0) + 1
            shop.total_revenue = (shop.total_revenue or 0.0) + total_amount

        order = Order(
            shop_id=product.shop_id,
            product_id=data.product_id,
            product_name=product.name,
            quantity=data.quantity,
            cost_price=cost_price,
            listed_price=listed_price,
            final_price=final_price,
            unit_price=unit_price,
            total_amount=total_amount,
            total_cost=total_cost,
            profit=profit,
            discount_given=discount_given,
            customer_id=customer.id if customer else None,
            customer_name=data.customer_name,
            customer_email=data.customer_email or (customer.email if customer else None),
            customer_phone=data.customer_phone or (customer.phone if customer else None),
            delivery_address=data.delivery_address or (customer.address if customer else None),
            notes=data.notes,
        )
        self.db.add(order)
        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def get_by_id(self, order_id: int) -> Optional[Order]:
        result = await self.db.execute(
            select(Order).where(Order.id == order_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self, status: Optional[str] = None, customer_email: Optional[str] = None, shop_id: Optional[int] = None, skip: int = 0, limit: int = 100
    ) -> List[Order]:
        query = select(Order)
        conditions = []
        if status:
            conditions.append(Order.status == status)
        if customer_email:
            conditions.append(Order.customer_email == customer_email)
        if shop_id:
            conditions.append(Order.shop_id == shop_id)
        if conditions:
            query = query.where(and_(*conditions))
        query = query.order_by(Order.created_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(
        self, order_id: int, data: OrderUpdate
    ) -> Optional[Order]:
        order = await self.get_by_id(order_id)
        if not order:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(order, field, value)

        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def cancel(self, order_id: int) -> Optional[Order]:
        order = await self.get_by_id(order_id)
        if not order:
            return None

        if order.status in [OrderStatus.SHIPPED.value, OrderStatus.DELIVERED.value]:
            return None  

        order.status = OrderStatus.CANCELLED.value
        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def get_last_order(self) -> Optional[Order]:
        result = await self.db.execute(
            select(Order).order_by(Order.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_shop(
        self, shop_id: int, status: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> List[Order]:
        """Get all orders for a specific shop"""
        conditions = [Order.shop_id == shop_id]
        if status:
            conditions.append(Order.status == status)

        result = await self.db.execute(
            select(Order)
            .where(and_(*conditions))
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())
