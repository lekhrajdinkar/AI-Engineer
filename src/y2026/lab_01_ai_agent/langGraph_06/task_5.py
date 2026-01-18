#!/usr/bin/env python3
"""Task 5: Conditional Routing - Dynamic path selection"""

import os
import time
from typing import TypedDict
from langgraph.graph import StateGraph, END

# ╔════════════════════════════════════════╗
# ║     Conditional Routing Flow          ║
# ╚════════════════════════════════════════╝
#
#       [START]
#          │
#          ▼
#    ┌───────────┐
#    │  analyze  │ Checks query length
#    └─────┬─────┘ Sets: query_length
#          │
#     ┌────┴────┐
#     │ router()│ Returns string based on
#     └────┬────┘ state["query_length"]
#          │
#    Returns: "quick" or "detailed"
#          │
#    ┌─────┴─────┐
#    ▼           ▼
# ┌──────┐   ┌──────────┐
# │quick │   │ detailed │
# │(<20) │   │  (>=20)  │
# └───┬──┘   └────┬─────┘
#     ▼           ▼
#   [END]       [END]
#
# CRITICAL: Router returns MUST match dict keys!
# ┌─────────────────────────────────────┐
# │ router() returns → dict keys match  │
# ├─────────────────────────────────────┤
# │ "quick"         → "quick": "quick"  │
# │ "detailed"      → "detailed": "..." │
# └─────────────────────────────────────┘
#
# BUG TO FIX: Line 100 has wrong key mapping!



# State with query analysis
class State(TypedDict):
    query: str
    query_length: str
    response: str

def router(state: State):
    """Decides which path to take based on query length"""
    if state["query_length"] == "short":  # Replace ___ with "short"
        return "quick"
    return "detailed"

# Analyze the query
def analyze_node(state: State):
    """Analyzes query to determine routing"""
    print("  🔄 Analyzing query length...")
    time.sleep(2)  # Helps visualize execution flow
    length = "short" if len(state["query"]) < 20 else "long"
    return {"query_length": length}

def quick_response_node(state: State):
    """Provides a quick response"""
    print("  🔄 Processing quick response...")
    time.sleep(2)  # Helps visualize execution flow
    response = f"Quick answer: {state['query'][:20]}..."
    return {"response": response}

def detailed_response_node(state: State):
    """Provides a detailed response"""
    print("  🔄 Processing detailed analysis...")
    time.sleep(2)  # Helps visualize execution flow
    response = f"Detailed analysis: Let me thoroughly explain '{state['query']}'"
    return {"response": response}


def build_and_run():
    print("🔀 Task 5: Conditional Routing\n")

    workflow = StateGraph(State)

    workflow.add_node("analyze", analyze_node)
    workflow.add_node("quick", quick_response_node)
    workflow.add_node("detailed", detailed_response_node)

    workflow.set_entry_point("analyze")  # Replace ___ with set_entry_point

    workflow.add_conditional_edges(
        "analyze",
        router,
        {
            "quick": "quick",      # When router returns "quick" → go to "quick" node
            "detailed": "detailed"  # Replace ___ with "detailed" - router returns this string!
        }
    )

    # Both paths lead to END
    workflow.add_edge("quick", END)
    workflow.add_edge("detailed", END)

    # Compile the graph
    app = workflow.compile()
    print("Graph compiled! Testing routing...\n")

    # Test with short query
    print("=" * 60)
    print("TEST 1: Short query")
    result1 = app.invoke({
        "query": "What is Python?",
        "query_length": "",
        "response": ""
    })
    print(f"Query: '{result1['query']}'")
    print(f"Route taken: {result1['query_length']} → quick")
    print(f"Response: {result1['response']}\n")


    # Test with long query
    print("=" * 60)
    print("TEST 2: Long query")
    result2 = app.invoke({
        "query": "Explain how LangGraph conditional routing works in detail",
        "query_length": "",
        "response": ""
    })
    print(f"Query: '{result2['query']}'")
    print(f"Route taken: {result2['query_length']} → detailed")
    print(f"Response: {result2['response']}")
