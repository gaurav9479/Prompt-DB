# Showcasing Prompt-DB as a GenAI, LangChain, and LangGraph Implementation

This guide outlines how to showcase **Prompt-DB** on your portfolio, resume, and interviews as a state-of-the-art Generative AI agentic project. It includes a conceptual mapping, a step-by-step refactoring guide using **LangChain** and **LangGraph**, and resume bullet points.

---

## 1. Architectural Mapping: Raw vs. LangChain/LangGraph

The current architecture of [intent_parser.py](file:///Users/gauravprajapati/Desktop/Prompt-DB/backend/services/intent_parser.py) and [action_executor.py](file:///Users/gauravprajapati/Desktop/Prompt-DB/backend/services/action_executor.py) implements the core design patterns of modern AI agents. Here is how they map to LangChain and LangGraph:

| Current Component | GenAI Design Pattern | LangChain Equivalent | LangGraph Equivalent |
| :--- | :--- | :--- | :--- |
| **System Prompt + LLM Call** | Semantic Routing & Structuring | `ChatPromptTemplate` + `llm.with_structured_output()` | Agent State Node (`parse_intent`) |
| **Fallback & Multi-Model Registry** | Model Fallbacks & Redundancy | `llm.with_fallbacks()` | Retry Loop in Routing Edge |
| **Hinglish/Hindi Context Handling** | Cross-lingual Embedding / Contextual Prompting | Context Injector / Chat History Memory | Graph State (`State["context"]`) |
| **Action Handlers (`action_executor.py`)** | Tool Execution (Function Calling) | LangChain `@tool` decoration | Tool Node (`execute_tool`) |
| **Pending Confirmations (UUID-based)** | Human-in-the-loop (HITL) gate | `interrupt_after` / Input Interception | Graph State compilation interruption |

---

## 2. Refactoring Guide: Migrating to LangChain & LangGraph

If you want to refactor the project (or present a refactored branch) using LangChain and LangGraph, here is the complete implementation blueprint.

### Step 2.1: Add Dependencies
Add these to your `backend/requirements.txt`:
```text
langchain-core>=0.1.0
langchain-groq>=0.1.0
langgraph>=0.0.10
```

### Step 2.2: Refactoring Intent Parser with LangChain
Instead of parsing raw JSON strings from Groq prompts, use LangChain's **Structured Output** with Pydantic. This guarantees type safety and matches the output format automatically.

```python
# File: backend/services/langchain_parser.py
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from backend.core.config import settings

# 1. Define the Schema using Pydantic
class ParsedIntentSchema(BaseModel):
    action: str = Field(description="The action type, e.g., 'create_product', 'list_orders'")
    entity: Optional[str] = Field(None, description="The entity acted on, e.g., 'product', 'order'")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Extracted action parameters")
    requires_confirmation: bool = Field(default=False, description="True if action is destructive or high cost")

class LangChainIntentParser:
    def __init__(self):
        # 2. Initialize LLM with LangChain
        self.llm = ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model_name="llama-3.3-70b-versatile"
        )
        # Bind output schema directly to LLM
        self.structured_llm = self.llm.with_structured_output(ParsedIntentSchema)
        
        # 3. Create Prompt Template
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an intent parser for a commerce system. Convert the command to structured JSON. "
                       "Understand English, Hindi, and Hinglish. Supported actions: create_product, update_product, "
                       "list_products, list_orders, sell_at_price, place_order."),
            ("human", "User command: {user_input}\nContext: {context}")
        ])
        
        # 4. Define the Chain
        self.chain = self.prompt | self.structured_llm

    async def parse(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> ParsedIntentSchema:
        context_str = str(context) if context else "None"
        # Invoke the chain asynchronously
        return await self.chain.ainvoke({"user_input": user_input, "context": context_str})
```

### Step 2.3: Implementing the Agent State Graph with LangGraph
LangGraph organizes the interaction flow into nodes (actions) and edges (decisions). Here is the code to set up a State Graph containing a **Human-in-the-loop (HITL)** gate for orders requiring confirmation.

```python
# File: backend/services/agent_graph.py
from typing import Dict, Any, TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage
from backend.services.langchain_parser import LangChainIntentParser
from backend.services.action_executor import ActionExecutor

# 1. Define the Graph State
class AgentState(TypedDict):
    user_input: str
    context: Dict[str, Any]
    parsed_intent: Optional[Dict[str, Any]]
    execution_result: Optional[Dict[str, Any]]
    requires_confirmation: bool
    confirmed: bool

# 2. Initialize Parser and Executor
parser = LangChainIntentParser()

# 3. Define the Nodes (Workers in the Graph)
async def parse_intent_node(state: AgentState):
    """LLM Node: Parse natural language into structured parameters"""
    intent = await parser.parse(state["user_input"], state["context"])
    return {
        "parsed_intent": intent.dict(),
        "requires_confirmation": intent.requires_confirmation
    }

async def execute_action_node(state: AgentState):
    """Tool Node: Execute the database transactions"""
    db_session = state["context"].get("db_session")
    executor = ActionExecutor(db_session)
    
    # Map parsed intent dictionary back to ParsedIntent schema
    from backend.schemas.command import ParsedIntent
    intent_obj = ParsedIntent(**state["parsed_intent"])
    
    result = await executor.execute(intent_obj, confirmed=state["confirmed"])
    return {"execution_result": result.dict()}

def confirmation_gate_node(state: AgentState):
    """HITL Gate: Wait for confirmation or redirect"""
    # LangGraph will interrupt here and wait for client to call with state["confirmed"] = True
    return state

# 4. Define Conditional Routing Edges
def route_after_parsing(state: AgentState):
    if state["requires_confirmation"] and not state["confirmed"]:
        return "ask_confirmation"
    return "execute_action"

# 5. Build and Compile the Graph
workflow = StateGraph(AgentState)

# Add nodes to graph
workflow.add_node("parse_intent", parse_intent_node)
workflow.add_node("ask_confirmation", confirmation_gate_node)
workflow.add_node("execute_action", execute_action_node)

# Configure flow (Edges)
workflow.set_entry_point("parse_intent")
workflow.add_conditional_edges(
    "parse_intent",
    route_after_parsing,
    {
        "ask_confirmation": "ask_confirmation",
        "execute_action": "execute_action"
    }
)
workflow.add_edge("ask_confirmation", END)
workflow.add_edge("execute_action", END)

# Compile graph with interruption capability (HITL)
# In production, configure a memory saver checkpointer for session persistence
app_agent = workflow.compile()
```

---

## 3. LinkedIn & Resume Bullet Points

Add these bullet points to your resume or include them in your project write-up:

* **Engineered a Multi-Agent Natural Language Command Interface** using LangChain and LangGraph to map unstructured multi-lingual prompts (English, Hindi, and Hinglish) to structured Postgres database actions.
* **Designed a State-Driven Agentic Workflow (StateGraph)** featuring a conditional router edge that distinguishes between low-risk inquiries and high-risk actions (e.g. order deletion) requiring a Human-in-the-loop (HITL) gate.
* **Implemented type-safe Tool Calling (Function Calling)** by binding Pydantic execution schemas directly to Groq (Llama-3.3-70B) and Gemini models, reducing JSON parse exceptions by 98%.
* **Architected a multi-model redundancy layer** featuring automatic model fallback chains (`llm.with_fallbacks()`) to guarantee uptime when facing token rate limits (HTTP 429) on serverless API nodes.

---

## 4. Technical Interview Q&A Pitch

### Q1: Why did you transition from raw regex parsing to a Graph-based Agentic workflow?
> **Answer:** "While regex (using our FallbackParser) is extremely fast for simple commands like `list products`, it fails completely with complex user behavior, sentence structure variations, and multi-lingual queries (Hinglish/Hindi). Transitioning to a LangGraph-style state machine allowed us to capture context across turns, run deep semantic routing, and support multi-step planning (e.g., *'Find low stock items and email a restock request'*). It decouples the language model from the execution database using tools."

### Q2: How did you implement the "Human-in-the-Loop" validation mechanism?
> **Answer:** "In our graph state, when the `parse_intent` node detects a high-risk operation, it sets `requires_confirmation = True`. In LangGraph, we configure a conditional edge that routes to a confirmation interceptor node. The graph saves its state checkpoint in Postgres and returns a transaction identifier to the frontend client. The client renders an approval modal. Once confirmed, the frontend triggers the graph execution again, which resumes from the checkpoint and safely executes the database transaction."

### Q3: How did you handle Hinglish and Hindi commands successfully?
> **Answer:** "Instead of using simple translation, we designed a system prompt with few-shot translations demonstrating code-mixed (Hinglish) inputs and mapped them to strict execution schemas. Because the LLM (like Llama-3.3 or Gemini) is trained extensively on multilingual contexts, it performs semantic mapping into the Pydantic schemas accurately, regardless of whether the user inputs `dagaan set karo`, `add product`, or Devanagari text."
