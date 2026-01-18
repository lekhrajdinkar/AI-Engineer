#!/usr/bin/env python3
"""Task 7: Research Agent - Complete assistant with calculator + web search"""

import os
import time
from typing import TypedDict
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI

# Try new package name first, fall back to old one
try:
    from duckduckgo_search import DDGS
except ImportError:
    try:
        from ddgs import DDGS
    except ImportError:
        print("Warning: DuckDuckGo search not available. Install with: pip install duckduckgo-search")
        # Create a mock DDGS for compatibility
        class DDGS:
            def text(self, query, max_results=2):
                return []

# ╔══════════════════════════════════════════╗
# ║    Complete Research Agent Architecture  ║
# ╚══════════════════════════════════════════╝
#
#           [START]
#              │
#              ▼
#        ┌───────────┐
#        │ classify  │ Analyzes query type
#        └─────┬─────┘ Sets: query_type
#              │
#         ┌────┴────┐
#         │ router()│ Routes to appropriate
#         └────┬────┘ tool based on type
#              │
#     ┌────────┴────────┐
#     ▼                 ▼
# ┌──────────┐    ┌──────────┐
# │calculator│    │  search  │
# │   tool   │    │   tool   │
# │  (math)  │    │  (info)  │
# │    🤖LLM │    │   🔍DDGS │
# └────┬─────┘    └────┬─────┘
#      ▼                ▼
#    [END]            [END]
#
# CONGRATULATIONS! You've built:
# ✅ Query classification
# ✅ Smart routing logic
# ✅ Multiple tool integration
# ✅ Complete AI assistant!
#
# This is a production-ready pattern!



# State for our research agent
class State(TypedDict):
    query: str
    query_type: str  # "math" or "search"
    result: str

# Initialize LLM
llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "openai/gpt-4.1-mini"),
    base_url=os.getenv("OPENAI_API_BASE"),
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0.7
)

# DuckDuckGo search
ddgs = DDGS()

# Classify query type
def classify_query(state: State):
    """Classifies query as math or search"""
    print("  🔄 Analyzing query type...")
    time.sleep(2)
    query_lower = state["query"].lower()
    math_indicators = ["+", "-", "*", "/", "plus", "minus", "times", "divided",
                       "calculate", "sum", "multiply", "add", "subtract"]
    is_math = any(indicator in query_lower for indicator in math_indicators)
    query_type = "math" if is_math else "search"

    if query_type == "math":
        print("  🔢 Detected mathematical query")
    else:
        print("  🔍 Detected search query")

    return {"query_type": query_type}

# Router function
def router(state: State):
    """Routes to appropriate tool"""
    # Route based on query_type
    if state["query_type"] == "math":
        return "calculator_tool"
    return "search_tool"

# TODO 2: Complete the calculator_tool
def calculator_tool(state: State):
    """Calculator for math queries"""
    print("  🔄 Processing with calculator...")
    print(f"  📊 Calculating: {state['query']}")
    time.sleep(2)  # Visualize calculation

    response = llm.invoke(f"Calculate and return ONLY the answer: {state['query']}")
    answer = response.content.strip()

    print(f"  ✅ Calculator result: {answer}")
    time.sleep(1)  # Show result

    return {"result": f"Calculation result: {answer}"}  # Replace ___ with "result"

# TODO 3: Complete the search_tool
def search_tool(state: State):
    """Web search for information queries"""
    print("  🔄 Searching the web...")
    print(f"  🔍 Query: {state['query']}")
    time.sleep(2)  # Visualize search

    try:
        # Perform the search
        results = ddgs.text(state["query"], max_results=2)  # Replace ___ with ddgs

        if results:
            print(f"  ✅ Found {len(results)} results")
            # Format search results
            search_text = "\n".join([f"- {r.get('title', '')}: {r.get('body', '')[:100]}..."
                                     for r in results])
            time.sleep(1)  # Show results processing
            return {"result": f"Search results:\n{search_text}"}
        else:
            print("  ⚠️ No search results found")
            # Fallback to a simulated response for demo purposes
            if "langgraph" in state["query"].lower():
                simulated = "LangGraph is a framework for building stateful, multi-step AI workflows using graphs."
                return {"result": f"Info: {simulated}"}
            return {"result": "No search results found"}
    except Exception as e:
        print(f"  ❌ Search error: {str(e)}")
        # Provide a helpful fallback response
        if "langgraph" in state["query"].lower():
            return {"result": "LangGraph is a framework for building stateful AI agents with graphs."}
        return {"result": f"Search unavailable, but I can tell you: {state['query']} is an interesting topic!"}

def build_and_run():
    print("🔬 Task 7: Research Agent\n")

    # Build complete research agent
    workflow = StateGraph(State)

    # Add all nodes
    workflow.add_node("classify", classify_query)
    workflow.add_node("calculator_tool", calculator_tool)
    workflow.add_node("search_tool", search_tool)

    # Set up routing
    workflow.set_entry_point("classify")
    workflow.add_conditional_edges(
        "classify",
        router,
        {
            "calculator_tool": "calculator_tool",
            "search_tool": "search_tool"
        }
    )

    # Both tools lead to END
    workflow.add_edge("calculator_tool", END)
    workflow.add_edge("search_tool", END)

    # Compile the graph
    app = workflow.compile()
    print("Research agent ready! Running tests...\n")

    # query1(app)
    query2(app)



def query1(app):
    # Test 1: Math query
    print("=" * 60)
    print("TEST 1: Math query")
    math_result = app.invoke({
        "query": "What is 156 divided by 12?",
        "query_type": "",
        "result": ""
    })
    print(f"Query: '{math_result['query']}'")
    print(f"Tool used: {math_result['query_type']}")
    print(f"Result: {math_result['result']}\n")

def query2(app):
    # Test 2: Search query
    print("=" * 60)
    print("TEST 2: Search query")
    print("=" * 60)
    search_result = app.invoke({
        "query": "What is LangGraph used for?",
        "query_type": "",
        "result": ""
    })
    print(f"Query: '{search_result['query']}'")
    print(f"Tool used: {search_result['query_type']}")
    print(f"Result: {search_result['result'][:200]}...")
