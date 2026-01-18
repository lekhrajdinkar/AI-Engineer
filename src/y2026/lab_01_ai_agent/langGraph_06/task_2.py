#!/usr/bin/env python3
"""Task 2: Creating Nodes - Functions that will become graph nodes"""

import time
from typing import TypedDict

# ┌─────────────────────────────────────────┐
# │  Understanding Nodes in LangGraph       │
# └─────────────────────────────────────────┘
#
#     ┌─────────────────┐
#     │  Initial State  │
#     │ name: "Alice"   │
#     │ greeting: ""    │
#     └────────┬────────┘
#              │
#              ▼
#     ┌─────────────────┐
#     │   greet_node    │ ← Node is a function
#     │  Takes state    │
#     │  Returns:       │
#     │  {greeting:...} │ ← Partial update
#     └────────┬────────┘
#              │ (LangGraph merges)
#              ▼
#     ┌─────────────────┐
#     │  Updated State  │
#     │ name: "Alice"   │ ← Unchanged
#     │ greeting:"Hello"│ ← Updated
#     └────────┬────────┘
#              │
#              ▼
#     ┌─────────────────┐
#     │  enhance_node   │ ← Another function
#     │  Takes state    │
#     │  Returns:       │
#     │  {greeting:...} │ ← Another update
#     └────────┬────────┘
#              │
#              ▼
#     ┌─────────────────┐
#     │   Final State   │
#     │ name: "Alice"   │
#     │ greeting:"Hello │
#     │  ...How are you?"│
#     └─────────────────┘
#


# Define our state structure
class State(TypedDict):
    name: str
    greeting: str

def greet_node(state: State):
    """A node that creates a greeting from the name"""
    print("  🔄 Processing in greet_node...")
    time.sleep(2)
    greeting = f"Hello, {state['name']}!"
    return {"greeting": greeting}

def enhance_node(state: State):
    """A node that enhances the greeting"""
    print("  🔄 Processing in enhance_node...")
    time.sleep(2)
    enhanced = state["greeting"] + " How are you?"
    return {"greeting": enhanced}

def main():
    print("📚 Task 2: Testing nodes manually...")

    initial_state = {"name": "Alice", "greeting": ""}
    print(f"Initial state: {initial_state}")

    print("\nCalling greet_node...")
    update1 = greet_node(initial_state)
    print(f"Node returned: {update1}")
    state_after_greet = {"name": "Alice", "greeting": update1["greeting"]}
    print(f"State after greet: {state_after_greet}")

    print("\nCalling enhance_node...")
    update2 = enhance_node(state_after_greet)
    print(f"Node returned: {update2}")
    final_state = {"name": "Alice", "greeting": update2["greeting"]}
    print(f"Final state: {final_state}")