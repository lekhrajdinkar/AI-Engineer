#!/usr/bin/env python3
"""Task 6: Simple Calculator Tool - First LLM integration"""

import os
import time
from typing import TypedDict
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

# ╔═══════════════════════════════════╗
# ║      Tool Selection Flow          ║
# ╚═══════════════════════════════════╝
#
#       [START]
#          │
#          ▼
#    ┌───────────┐
#    │ classify  │ Check if math query
#    └─────┬─────┘ Sets: is_math boolean
#          │
#     ┌────┴────┐
#     │ router()│ Routes based on
#     └────┬────┘ state["is_math"]
#          │
#    ┌─────┴─────┐
#    ▼           ▼
# ┌──────────┐ ┌─────────┐
# │calculator│ │ general │
# │ (is_math)│ │(!is_math)│
# │   🤖LLM  │ │ message │
# └────┬─────┘ └────┬────┘
#      ▼            ▼
#    [END]        [END]
#
# KEY CONCEPTS:
# - First LLM integration!
# - LLM acts as calculator tool
# - Router selects appropriate tool
# - Different paths for different queries



# State for our calculator
class State(TypedDict):
    query: str
    is_math: bool
    result: str

# Define our calculator tool (structured tool!)
@tool
def calculator_tool(expression: str) -> str:
    """
    Evaluates basic mathematical expressions.

    Args:
        expression: A mathematical expression like "25 + 17" or "100 / 4"

    Returns:
        The calculated result as a string
    """
    try:
        # For safety, only allow basic math operations
        allowed_names = {
            'abs': abs,
            'round': round,
            'min': min,
            'max': max,
            'sum': sum,
            'len': len,
            'int': int,
            'float': float
        }
        # Evaluate the expression safely
        result = eval(expression, {"__builtins__": {}}, allowed_names)
        print("result", result)
        return str(result)
    except Exception as e:
        return f"Error calculating: {str(e)}"

# Initialize LLM (first time using it!)
llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "openai/gpt-4.1-mini"),
    base_url=os.getenv("OPENAI_API_BASE"),
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0  # Low temperature for math accuracy
)

# Bind the tool to the LLM (this is how tools are attached!)
llm_with_calculator = llm.bind_tools([calculator_tool])

# Classify if query is mathematical
def classify_node(state: State):
    """Determines if query is mathematical"""
    print("  🔄 Analyzing query type...")
    time.sleep(2)  # Helps visualize classification

    query_lower = state["query"].lower()
    # Check for math indicators
    math_keywords = ["+", "-", "*", "/", "plus", "minus", "times", "divided", "calculate", "sum"]
    is_math = any(keyword in query_lower for keyword in math_keywords)

    if is_math:
        print("  ✅ Detected mathematical query")
    else:
        print("  ℹ️ Non-mathematical query")

    return {"is_math": is_math}

def router(state: State):
    """Routes to calculator or general response"""
    if state["is_math"]:  # Replace ___ with "is_math"
        return "calculator"
    return "general"

def calculator_node(state: State):
    """Uses LLM with calculator tool"""
    print("  🔄 Processing mathematical query...")
    print("  📊 Invoking calculator tool...")
    time.sleep(2)  # Visualize tool selection

    # Ask LLM to use the calculator tool
    prompt = f"Calculate the following using the calculator tool: {state['query']}"
    response = llm_with_calculator.invoke(prompt)

    # Extract the answer from the response
    if hasattr(response, 'tool_calls') and response.tool_calls:
        # LLM called the tool
        tool_call = response.tool_calls[0]
        print(f"  🔧 Tool called: {tool_call['name']}")
        print(f"  📝 Expression: {tool_call['args'].get('expression', '')}")

        # Execute the tool
        result = calculator_tool.invoke(tool_call['args'])
        answer = result
    else:
        # Fallback to direct response
        answer = response.content.strip()

    print("  ✅ Calculator returned result")
    time.sleep(1)  # Show result processing

    return {"___": f"Answer: {answer}"}  # Replace ___ with "result"

# General response for non-math queries
def general_response_node(state: State):
    """Handles non-mathematical queries"""
    print("  🔄 Processing non-mathematical query...")
    time.sleep(2)  # Helps visualize processing
    print("  ℹ️ Providing general response")
    return {"result": "This is not a math question. Please ask a calculation!"}

def build_and_run():
    print("🧮 Task 6: Simple Calculator Tool\n")

    workflow = StateGraph(State)

    workflow.add_node("classify", classify_node)
    workflow.add_node("calculator", calculator_node)
    workflow.add_node("general", general_response_node)

    workflow.set_entry_point("classify")
    workflow.add_conditional_edges(
        "classify",
        router,
        {
            "calculator": "calculator",  # Replace ___ with "calculator"
            "general": "general"
        }
    )

    # Both paths lead to END
    workflow.add_edge("calculator", END)
    workflow.add_edge("general", END)

    # Compile the graph
    app = workflow.compile()
    print("Graph compiled! Testing calculator...\n")


    # Test with math query
    print("=" * 60)
    print("TEST 1: Math query")
    test1 = app.invoke({
        "query": "What is 25 plus 17?",
        "is_math": False,
        "result": ""
    })
    print(f"Query: '{test1['query']}'")
    print(f"Result: {test1['result']}\n")


    # Test with non-math query
    print("=" * 60)
    print("TEST 2: Non-math query")
    test2 = app.invoke({
        "query": "What is the weather today?",
        "is_math": False,
        "result": ""
    })
    print(f"Query: '{test2['query']}'")
    print(f"Result: {test2['result']}")
