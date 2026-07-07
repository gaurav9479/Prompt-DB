import logging
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from backend.core.database import get_db
from backend.core.websocket import manager
from backend.schemas.command import CommandInput, CommandResponse, ParsedIntent, MultiStepPlan

from backend.schemas.order import OrderCreate, OrderUpdate, OrderResponse
from backend.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse

from backend.services.intent_parser import IntentParser
from backend.services.action_executor import ActionExecutor

from backend.models.action_log import ActionLog

from backend.services.command_suggestions import CommandSuggestionService

router = APIRouter()
command_suggestion_service = CommandSuggestionService()
logger = logging.getLogger(__name__)

session_context: Dict[str, Any] = {}





from sqlalchemy import select
from backend.models.shop import Shop


async def execute_command(
    command: CommandInput,
    db: AsyncSession = None
):
    try:
        parser = IntentParser()
        executor = ActionExecutor(db)
        context = {**session_context, **(command.context or {})}
        intent = await parser.parse(command.text, context)

        _SHOP_SCOPED_ACTIONS = {
            "create_product", "update_product", "list_products",
            "get_low_stock", "restock_product", "set_product_price",
            "toggle_product_status", "set_featured", "get_shop_dashboard",
            "get_shop_low_stock", "get_shop_orders", "get_expiring_soon",
            "get_clearance_products", "get_daily_profit", "get_product_profit",
            "get_profit_summary", "sell_at_price", "list_orders",
        }
        user_id = context.get("user_id")
        if user_id is not None:
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                user_id = None

        ctx_shop_id = context.get("shop_id")
        if ctx_shop_id is not None:
            try:
                ctx_shop_id = int(ctx_shop_id)
            except (ValueError, TypeError):
                ctx_shop_id = None

        if isinstance(intent, ParsedIntent):
            intent.parameters = intent.parameters or {}
            if ctx_shop_id is not None and intent.action in _SHOP_SCOPED_ACTIONS and "shop_id" not in intent.parameters:
                intent.parameters["shop_id"] = ctx_shop_id
            if intent.action in ["place_order", "list_my_orders"]:
                if "customer_name" not in intent.parameters and context.get("customer_name"):
                    intent.parameters["customer_name"] = context.get("customer_name")
                if "customer_email" not in intent.parameters and context.get("customer_email"):
                    intent.parameters["customer_email"] = context.get("customer_email")
        elif isinstance(intent, MultiStepPlan):
            for step in intent.steps:
                step.parameters = step.parameters or {}
                if ctx_shop_id is not None and step.action in _SHOP_SCOPED_ACTIONS and "shop_id" not in step.parameters:
                    step.parameters["shop_id"] = ctx_shop_id
                if step.action in ["place_order", "list_my_orders"]:
                    if "customer_name" not in step.parameters and context.get("customer_name"):
                        step.parameters["customer_name"] = context.get("customer_name")
                    if "customer_email" not in step.parameters and context.get("customer_email"):
                        step.parameters["customer_email"] = context.get("customer_email")

        log = ActionLog(
            user_input=command.text,
            parsed_intent=intent.model_dump() if isinstance(intent, ParsedIntent) else {"steps": [s.model_dump() for s in intent.steps]},
            user_id=user_id,
            shop_id=ctx_shop_id,
        )
        db.add(log)

        if isinstance(intent, MultiStepPlan):
            results = await executor.execute_plan(intent)
            log.action_taken = "multi_step_plan"
            log.status = "completed" if all(r.success for r in results) else "partial"
            log.result = [r.model_dump() for r in results]
            
            if results and all(r.success for r in results):
                log.user_message = "Multi-step plan completed successfully"
                log.shopkeeper_message = "Multi-step plan executed successfully"
            else:
                log.user_message = "Multi-step plan failed or completed partially"
                log.shopkeeper_message = "Multi-step plan failed or completed partially"
                
            await db.commit()
            for result in results:
                await manager.broadcast_action(result.action, result.success, result.data, result.message)
                if result.success:
                    entity, operation = _get_entity_operation(result.action)
                    if entity:
                        await manager.broadcast_update(entity, operation, result.data)
            return results[-1] if results else CommandResponse(success=False, action="error", message="No actions executed")
        else:
            result = await executor.execute(intent)
            log.action_taken = intent.action
            log.status = "completed" if result.success else "failed"
            log.result = result.model_dump()
            
            if result.success and isinstance(result.data, dict):
                res_shop_id = result.data.get("shop_id")
                if res_shop_id:
                    try:
                        log.shop_id = int(res_shop_id)
                    except (ValueError, TypeError):
                        pass

            if result.success:
                if intent.action == "place_order" and isinstance(result.data, dict):
                    qty = result.data.get("quantity", 1)
                    prod_name = result.data.get("product") or "item"
                    shop_name = "the shop"
                    if log.shop_id:
                        shop_res = await db.execute(select(Shop.name).where(Shop.id == log.shop_id))
                        shop_name_val = shop_res.scalar()
                        if shop_name_val:
                            shop_name = shop_name_val
                    
                    customer_name = intent.parameters.get("customer_name") or "Customer"
                    if user_id:
                        log.user_message = f"You bought {qty}x {prod_name} from {shop_name}"
                        log.shopkeeper_message = f"You sold {qty}x {prod_name} to {customer_name} (Registered)"
                    else:
                        log.user_message = None
                        log.shopkeeper_message = f"You sold {qty}x {prod_name} to {customer_name} (Unregistered Guest)"
                elif intent.action == "create_product" and isinstance(result.data, dict):
                    prod_name = result.data.get("name") or "product"
                    sku = intent.parameters.get("sku") or "N/A"
                    log.user_message = None
                    log.shopkeeper_message = f"You added product '{prod_name}' (SKU: {sku})"
                else:
                    log.user_message = f"Action '{intent.action}' completed successfully"
                    log.shopkeeper_message = f"Action '{intent.action}' executed successfully"
            else:
                log.user_message = f"Failed to execute '{intent.action}': {result.message}"
                log.shopkeeper_message = f"Failed to execute '{intent.action}': {result.message}"

            await db.commit()
            if result.success and result.data and "id" in result.data:
                session_context["last_entity_id"] = result.data["id"]
                session_context["last_entity_type"] = intent.entity
            await manager.broadcast_action(result.action, result.success, result.data, result.message)
            if result.success:
                entity, operation = _get_entity_operation(intent.action)
                if entity:
                    await manager.broadcast_update(entity, operation, result.data)
            return result
    except Exception as exc:
        logger.exception("Command execution failed")
        if db is not None:
            try:
                await db.rollback()
            except Exception:
                pass
        return CommandResponse(success=False, action="error", message=f"Command failed: {exc}")




_ACTION_ENTITY_MAP = {
    "create_product":          ("product", "created"),
    "update_product":          ("product", "updated"),
    "delete_product":          ("product", "deleted"),
    "restock_product":         ("product", "updated"),
    "set_product_price":       ("product", "updated"),
    "toggle_product_status":   ("product", "updated"),
    "set_featured":            ("product", "updated"),
    "create_order":            ("order", "created"),
    "update_order":            ("order", "updated"),
    "cancel_order":            ("order", "updated"),
    "confirm_order":           ("order", "updated"),
    "ship_order":              ("order", "updated"),
    "deliver_order":           ("order", "updated"),
    "refund_order":            ("order", "updated"),
    "create_customer":         ("customer", "created"),
    "update_customer":         ("customer", "updated"),
    "delete_customer":         ("customer", "deleted"),
    "create_shop":             ("shop", "created"),
    "update_shop":             ("shop", "updated"),
    "delete_shop":             ("shop", "deleted"),
}

def _get_entity_operation(action: str):
    return _ACTION_ENTITY_MAP.get(action, (None, None))


async def confirm_command(confirmation_id: str, db: AsyncSession = None):
    executor = ActionExecutor(db)
    result = await executor.confirm_action(confirmation_id)
    await manager.broadcast_action(result.action, result.success, result.data, result.message)
    if result.success:
        entity, operation = _get_entity_operation(result.action)
        if entity:
            await manager.broadcast_update(entity, operation, result.data)
    return result





async def get_command_suggestions(
    query: str = "",
    role: str = "customer",
    limit: int = 5
):

    suggestions = command_suggestion_service.get_suggestions(query, role, limit)
    return {"suggestions": suggestions}



async def get_all_commands(role: str = "customer"):

    commands = command_suggestion_service.get_all_commands(role)
    return {"commands": commands}



async def get_quick_actions(role: str = "customer"):

    actions = command_suggestion_service.get_quick_actions(role)
    return {"quick_actions": actions}



async def get_command_help(command: str):

    help_info = command_suggestion_service.get_command_help(command)
    if not help_info:
        raise HTTPException(status_code=404, detail="Command not found")
    return help_info


async def get_customer_logs(user_id: int, db: AsyncSession):
    result = await db.execute(
        select(ActionLog)
        .where(ActionLog.user_id == user_id)
        .order_by(ActionLog.created_at.desc())
        .limit(20)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "user_input": l.user_input,
            "action_taken": l.action_taken,
            "status": l.status,
            "message": l.user_message,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs if l.user_message
    ]

async def get_shop_logs(shop_id: int, db: AsyncSession):
    result = await db.execute(
        select(ActionLog)
        .where(ActionLog.shop_id == shop_id)
        .order_by(ActionLog.created_at.desc())
        .limit(20)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "user_input": l.user_input,
            "action_taken": l.action_taken,
            "status": l.status,
            "message": l.shopkeeper_message,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs if l.shopkeeper_message
    ]





