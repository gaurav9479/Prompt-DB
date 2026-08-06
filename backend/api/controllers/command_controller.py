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
        context = {**session_context, **(command.context or {})}
        confirmed = command.context.get("confirmed", False) if command.context else False

        # 1. Build initial state for LangGraph workflow
        initial_state = {
            "user_input": command.text,
            "context": {**context, "db_session": db},
            "parsed_intent": None,
            "execution_result": None,
            "requires_confirmation": False,
            "confirmed": confirmed,
            "error": None
        }

        # 2. Invoke compiled LangGraph
        from backend.services.agent_graph import app_agent_graph
        final_state = await app_agent_graph.ainvoke(initial_state)

        # 3. Handle parser or graph errors
        if final_state.get("error"):
            return CommandResponse(
                success=False,
                action="error",
                message=final_state["error"]
            )

        parsed_intent_data = final_state["parsed_intent"]
        execution_result_data = final_state["execution_result"]

        # Context updates for shop actions mapping (shop scoping)
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

        if parsed_intent_data:
            if parsed_intent_data.get("is_plan"):
                for step in parsed_intent_data["steps"]:
                    step["parameters"] = step.get("parameters") or {}
                    if ctx_shop_id is not None and step["action"] in _SHOP_SCOPED_ACTIONS and "shop_id" not in step["parameters"]:
                        step["parameters"]["shop_id"] = ctx_shop_id
            else:
                parsed_intent_data["parameters"] = parsed_intent_data.get("parameters") or {}
                if ctx_shop_id is not None and parsed_intent_data["action"] in _SHOP_SCOPED_ACTIONS and "shop_id" not in parsed_intent_data["parameters"]:
                    parsed_intent_data["parameters"]["shop_id"] = ctx_shop_id

        # 4. Log intent in ActionLog
        log = ActionLog(
            user_input=command.text,
            parsed_intent=parsed_intent_data,
            user_id=user_id,
            shop_id=ctx_shop_id,
        )
        db.add(log)

        # 5. Check for Human-In-The-Loop Confirmation
        if final_state["requires_confirmation"] and not final_state["confirmed"]:
            import uuid
            confirmation_id = str(uuid.uuid4())
            action = parsed_intent_data.get("action", "unknown") if parsed_intent_data else "unknown"
            msg = parsed_intent_data.get("confirmation_message") if parsed_intent_data else None
            msg = msg or f"Are you sure you want to {action}?"
            
            log.action_taken = action
            log.status = "pending_confirmation"
            await db.commit()
            
            return CommandResponse(
                success=False,
                action=action,
                message=msg,
                requires_confirmation=True,
                confirmation_id=confirmation_id
            )

        # 6. Process action execution results
        if execution_result_data:
            result = CommandResponse(**execution_result_data)
            log.action_taken = result.action
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
                if result.action == "place_order" and isinstance(result.data, dict):
                    qty = result.data.get("quantity", 1)
                    prod_name = result.data.get("product") or "item"
                    shop_name = "the shop"
                    if log.shop_id:
                        shop_res = await db.execute(select(Shop.name).where(Shop.id == log.shop_id))
                        shop_name_val = shop_res.scalar()
                        if shop_name_val:
                            shop_name = shop_name_val
                    
                    customer_name = context.get("customer_name") or "Customer"
                    if user_id:
                        log.user_message = f"You bought {qty}x {prod_name} from {shop_name}"
                        log.shopkeeper_message = f"You sold {qty}x {prod_name} to {customer_name} (Registered)"
                    else:
                        log.user_message = None
                        log.shopkeeper_message = f"You sold {qty}x {prod_name} to {customer_name} (Unregistered Guest)"
                elif result.action == "create_product" and isinstance(result.data, dict):
                    prod_name = result.data.get("name") or "product"
                    sku = result.data.get("sku") or "N/A"
                    log.user_message = None
                    log.shopkeeper_message = f"You added product '{prod_name}' (SKU: {sku})"
                else:
                    log.user_message = f"Action '{result.action}' completed successfully"
                    log.shopkeeper_message = f"Action '{result.action}' executed successfully"
            else:
                log.user_message = f"Failed to execute '{result.action}': {result.message}"
                log.shopkeeper_message = f"Failed to execute '{result.action}': {result.message}"

            await db.commit()
            if result.success and result.data and isinstance(result.data, dict) and "id" in result.data:
                session_context["last_entity_id"] = result.data["id"]
                if parsed_intent_data and not parsed_intent_data.get("is_plan"):
                    session_context["last_entity_type"] = parsed_intent_data.get("entity")

            # Broadcast changes to websockets clients
            await manager.broadcast_action(result.action, result.success, result.data, result.message)
            if result.success:
                entity, operation = _get_entity_operation(result.action)
                if entity:
                    await manager.broadcast_update(entity, operation, result.data)
            return result
        else:
            return CommandResponse(
                success=False,
                action="error",
                message="Workflow did not produce execution results."
            )
    except Exception as exc:
        logger.exception("Command execution failed in LangGraph workflow")
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





