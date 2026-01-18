#!/usr/bin/env python3
"""Task 1: Understanding Imports - Setting up LangGraph basics"""

def main():
    print("📚 Task 1: Understanding Imports\n")

    from langgraph.graph import StateGraph, END
    from typing import TypedDict

    class State(TypedDict):
        messages: list  # Replace with list
        next_step: str

    print("Testing imports...")
    try:
        test_graph = StateGraph(State)
        print("✅ StateGraph imported successfully!")
        print(f"✅ State has fields: {list(State.__annotations__.keys())}")
        print(f"✅ END constant is available: {END}")
    except:
        print("❌ Complete the TODOs to make imports work!")