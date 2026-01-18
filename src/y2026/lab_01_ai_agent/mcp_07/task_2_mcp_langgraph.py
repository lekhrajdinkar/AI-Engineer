#!/usr/bin/env python3
"""Task 2: MCP and LangGraph Integration - Connecting MCP servers to agents"""

import os
import asyncio
from typing import TypedDict

from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

# ╔════════════════════════════════════════╗
# ║   MCP + LangGraph Integration Flow     ║
# ╚════════════════════════════════════════╝
#
#        [User Query]
#             │
#             ▼
#     ┌───────────────┐
#     │ LangGraph     │
#     │ React Agent   │
#     └───────┬───────┘
#             │
#       ┌─────┴─────┐
#       │MCP Client │
#       └─────┬─────┘
#             │
#       ┌─────┴─────┐
#       ▼           ▼
# ┌──────────┐ ┌─────────┐
# │MCP Server│ │   LLM   │
# │Calculator│ │Response │
# │   🔢     │ │   💬    │
# └──────────┘ └─────────┘
#
# MCP Tool Naming Convention:
# When tools are loaded, they follow pattern:
# Original: add, multiply
# In Agent: Automatically handled by MCP adapter

print("🔌 Task 2: MCP and LangGraph Integration\n")
from langchain_mcp_adapters.client import MultiServerMCPClient

# Initialize the LLM
model = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "openai/gpt-4.1-mini"),
    base_url=os.getenv("OPENAI_API_BASE"),
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0
)

# 1: Initialize MultiServerMCPClient
client = MultiServerMCPClient(
    {
        "calculator": {
            "command": "python",
            "args": ["/root/code/task_1_mcp_basics.py"], # calculator mcp
            #"args": ["C:\Users\Manisha\Documents\github-2025\genai\src\y2026\lab_01_ai_agent\mcp_07\task_1_mcp_basics.py"],
            "transport": "stdio",
        }
    }
)

async def run_agent_with_mcp():
    """Create and run agent with MCP tools"""
    tools = await client.get_tools()
    agent:  CompiledStateGraph = create_react_agent(model, tools)
    print("✅ Agent created with MCP tools!\n")

    # Test 1: Math query (should use MCP tools)
    print("\nTest 1: Math Query")
    math_response = await agent.ainvoke({
        "messages": "What is 25 plus 17?"
    })
    print(f"Response: {math_response['messages'][-1].content}")

    # Test 2: Another math query
    print("\nTest 2: Multiplication Query")
    multiply_response = await agent.ainvoke({
        "messages": "Calculate 8 times 9"
    })
    print(f"Response: {multiply_response['messages'][-1].content}")

    # Test 3: Complex math
    print("\nTest 3: Complex Math")
    complex_response = await agent.ainvoke({
        "messages": "What's (3 + 5) x 12?"
    })
    print(f"Response: {complex_response['messages'][-1].content}")

    # Test 4: Non-math query
    print("\nTest 4: Non-Math Query")
    general_response = await agent.ainvoke({
        "messages": "What is the capital of France?"
    })
    print(f"Response: {general_response['messages'][-1].content}")

# Run the agent
if __name__ == "__main__":
    print("Starting MCP + LangGraph integration...")

    # Run async function
    asyncio.run(run_agent_with_mcp())

    print("\n" + "=" * 60)
    print("💡 KEY CONCEPTS:")
    print("- MultiServerMCPClient connects to MCP servers")
    print("- client.get_tools() loads tools from servers")
    print("- create_react_agent builds agent with tools")
    print("- Agent automatically routes to appropriate tools")
    print("- MCP handles tool execution transparently")
    print("=" * 60)

    # Create marker file
    os.makedirs("/root/markers", exist_ok=True)
    with open("/root/markers/task2_integration_complete.txt", "w") as f:
        f.write("TASK2_COMPLETE")

"""

🔌 Task 2: MCP and LangGraph Integration

Building MCP-integrated agent:

Starting MCP + LangGraph integration...
Processing request of type ListToolsRequest
/root/code/task_2_mcp_langgraph.py:69: LangGraphDeprecatedSinceV10: create_react_agent has been moved to `langchain.agents`. Please update your import to `from langchain.agents import create_agent`. Deprecated in LangGraph V1.0 to be removed in V2.0.
  agent:  CompiledStateGraph = create_react_agent(model, tools)
✅ Agent created with MCP tools!


Test 1: Math Query
Processing request of type CallToolRequest
Processing request of type ListToolsRequest
Response: 25 plus 17 is 42.

Test 2: Multiplication Query
Processing request of type CallToolRequest
Processing request of type ListToolsRequest
Response: 8 times 9 is 72.

Test 3: Complex Math
Processing request of type CallToolRequest
Processing request of type ListToolsRequest
Processing request of type CallToolRequest
Processing request of type ListToolsRequest
Processing request of type CallToolRequest
Processing request of type ListToolsRequest
Response: (3 + 5) x 12 = 96

Test 4: Non-Math Query
Response: The capital of France is Paris.

============================================================
💡 KEY CONCEPTS:
- MultiServerMCPClient connects to MCP servers
- client.get_tools() loads tools from servers
- create_react_agent builds agent with tools
- Agent automatically routes to appropriate tools
- MCP handles tool execution transparently
============================================================

"""