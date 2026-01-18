#!/usr/bin/env python3
"""Task 3: Connecting Nodes with Edges - Building your first graph"""

import os
import time
from typing import TypedDict
from langgraph.graph import StateGraph, END

# ┌──────────────────────────────────────┐
# │   Building Your First Graph          │
# └──────────────────────────────────────┘
#
#  Step 1: Create Graph Container
#  ┌──────────────────────────────┐
#  │     StateGraph(State)        │
#  │  Container for your workflow │
#  └──────────────────────────────┘
#                │
#  Step 2: Register Functions as Nodes
#     ┌──────────┴──────────┐
#     │   add_node()        │
#     │  "greet" → func     │
#     │  "enhance" → func   │
#     └─────────────────────┘
#
#  Step 3: Connect with Edges
#  ╔═══════════════════════════╗
#  ║    Execution Flow:        ║
#  ╟───────────────────────────╢
#  ║      [START]              ║
#  ║         │                 ║
#  ║         ▼                 ║
#  ║   ┌─────────────┐         ║
#  ║   │    greet    │         ║
#  ║   │ (greet_node)│         ║
#  ║   └──────┬──────┘         ║
#  ║          │ add_edge       ║
#  ║          ▼                ║
#  ║   ┌─────────────┐         ║
#  ║   │   enhance   │         ║
#  ║   │(enhance_node)│        ║
#  ║   └──────┬──────┘         ║
#  ║          │                ║
#  ║          ▼                ║
#  ║       [END]               ║
#  ╚═══════════════════════════╝
#
# KEY CONCEPT: add_node() registers functions
# add_edge() defines execution order



# Define our state
class State(TypedDict):
    name: str
    greeting: str

# Our nodes from Task 2 (now with timing)
def greet_node(state: State):
    """Creates initial greeting"""
    print("  🔄 Processing in greet_node...")
    time.sleep(2)  # Helps visualize execution flow
    greeting = f"Hello, {state['name']}!"
    return {"greeting": greeting}

def enhance_node(state: State):
    """Enhances the greeting"""
    print("  🔄 Processing in enhance_node...")
    time.sleep(2)  # Helps visualize execution flow
    enhanced = state["greeting"] + " Welcome to LangGraph!"
    return {"greeting": enhanced}

def build_graph_and_run():
    print("🔗 Task 3: Connecting Nodes with Edges\n")
    workflow = StateGraph(State)
    workflow.add_node("greet", greet_node)
    workflow.add_node("enhance", enhance_node)

    # Connect nodes with edges
    workflow.set_entry_point("greet")
    workflow.add_edge("greet", "enhance")
    workflow.add_edge("enhance", END)

    app = workflow.compile()
    print("✅ Graph compiled successfully!\n")

    # Run the graph!
    print("Running the graph:")
    init_state = {"name": "Bob", "greeting": ""}
    result = app.invoke(init_state)

    print(f"\nFinal result: {result}")
