import logging
from typing import Dict, Any, Optional, TypedDict, Union
from langgraph.graph import StateGraph, END

from backend.services.intent_parser import IntentParser
from backend.services.action_executor import ActionExecutor
from backend.schemas.command import ParsedIntent, CommandResponse, MultiStepPlan

logger = logging.getLogger(__name__)

# 1. Define the LangGraph State Schema
class AgentState(TypedDict):
    user_input: str
    context: Dict[str, Any]
    parsed_intent: Optional[Dict[str, Any]]  # ParsedIntent serialized dict
    execution_result: Optional[Dict[str, Any]]  # CommandResponse serialized dict
    requires_confirmation: bool
    confirmed: bool
    error: Optional[str]


# 2. Define the Nodes
async def parse_intent_node(state: AgentState) -> Dict[str, Any]:
    """LLM parsing node using the LangChain IntentParser."""
    parser = IntentParser()
    try:
        result = await parser.parse(state["user_input"], state["context"])
        
        # Check if LLM returned an error intent
        if isinstance(result, ParsedIntent) and result.action == "error":
            return {
                "error": result.parameters.get("error", "Failed to parse intent"),
                "requires_confirmation": False
            }
            
        # Serialize the parsed intent/plan for the graph state
        if isinstance(result, MultiStepPlan):
            parsed_dict = {
                "is_plan": True,
                "steps": [step.model_dump() for step in result.steps]
            }
            requires_conf = any(step.requires_confirmation for step in result.steps)
        else:
            parsed_dict = result.model_dump()
            requires_conf = result.requires_confirmation
            
        return {
            "parsed_intent": parsed_dict,
            "requires_confirmation": requires_conf,
            "error": None
        }
    except Exception as e:
        logger.error(f"Error in parse_intent_node: {e}")
        return {
            "error": f"Parsing failed: {str(e)}",
            "requires_confirmation": False
        }


async def execute_action_node(state: AgentState) -> Dict[str, Any]:
    """Action execution node running the corresponding service calls."""
    if state.get("error"):
        return {}

    db_session = state["context"].get("db_session")
    if not db_session:
        return {"error": "Database session missing in graph context."}
        
    executor = ActionExecutor(db_session)
    parsed_intent_data = state["parsed_intent"]
    
    if not parsed_intent_data:
        return {"error": "No parsed intent found to execute."}

    try:
        # Check if we are executing a multi-step plan
        if parsed_intent_data.get("is_plan"):
            steps = [ParsedIntent(**step) for step in parsed_intent_data["steps"]]
            plan = MultiStepPlan(steps=steps)
            results = await executor.execute_plan(plan)
            
            # Aggregate plan results
            success = all(r.success for r in results)
            message = "Plan executed: " + "; ".join(r.message for r in results)
            execution_data = [r.model_dump() for r in results]
            
            response = CommandResponse(
                success=success,
                action="multi_step_plan",
                message=message,
                data=execution_data,
                requires_confirmation=False
            )
        else:
            # Execute single action
            intent_obj = ParsedIntent(**parsed_intent_data)
            response = await executor.execute(intent_obj, confirmed=state["confirmed"])
            
        return {"execution_result": response.model_dump()}
    except Exception as e:
        logger.error(f"Error in execute_action_node: {e}")
        return {
            "error": f"Execution failed: {str(e)}"
        }


# 3. Define the Router Edge logic
def route_after_parsing(state: AgentState) -> str:
    """Decides whether to execute immediately or halt for human-in-the-loop confirmation."""
    if state.get("error"):
        return END
        
    # If the parser says confirmation is required, and the user hasn't confirmed yet, end the turn.
    if state["requires_confirmation"] and not state["confirmed"]:
        return END
        
    return "execute_action"


# 4. Build the State Graph
workflow = StateGraph(AgentState)

# Add nodes to graph
workflow.add_node("parse_intent", parse_intent_node)
workflow.add_node("execute_action", execute_action_node)

# Set entry point
workflow.set_entry_point("parse_intent")

# Add conditional edges
workflow.add_conditional_edges(
    "parse_intent",
    route_after_parsing,
    {
        END: END,
        "execute_action": "execute_action"
    }
)

# Connect execute node to END
workflow.add_edge("execute_action", END)

# Compile graph
app_agent_graph = workflow.compile()
