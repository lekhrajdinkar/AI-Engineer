#!/usr/bin/env python3
"""Task 3: Multiple MCP Servers - Orchestrating calculator and weather servers"""

import os
import asyncio
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

# ╔════════════════════════════════════════════╗
# ║     Multiple MCP Servers Architecture      ║
# ╚════════════════════════════════════════════╝
#
#              [User Query]
#                    │
#                    ▼
#            ┌──────────────┐
#            │  LangGraph   │
#            │ React Agent  │
#            └──────┬───────┘
#                   │
#         ┌─────────┴─────────┐
#         │MultiServerMCPClient│
#         └─────────┬─────────┘
#                   │
#      ┌────────────┴────────────┐
#      ▼                         ▼
# ┌──────────┐            ┌──────────┐
# │Calculator│            │ Weather  │
# │MCP Server│            │MCP Server│
# │    🔢    │            │    ☁️    │
# └──────────┘            └──────────┘
#
# The agent "automatically" routes to the appropriate MCP server
# based on the query content and available tools

print("🌐 Task 3: Multiple MCP Servers\n")
from langchain_mcp_adapters.client import MultiServerMCPClient

model = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "openai/gpt-4.1-mini"),
    base_url=os.getenv("OPENAI_API_BASE"),
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0
)


# Initialize MultiServerMCPClient with both servers
client = MultiServerMCPClient(
    {
        "calculator": {
            "command": "python",
            "args": ["/root/code/mcp_servers/calculator_server.py"],
            "transport": "stdio",
        },
        "weather": {
            "command": "python",
            "args": ["/root/code/mcp_servers/weather_server.py"],
            "transport": "stdio",  # Replace ___ with "stdio"
        }
    }
)

async def run_multi_server_agent():
    """Create and run agent with multiple MCP servers"""

    print("📦 Loading tools from multiple servers...")

    # Get all tools from both servers
    tools = await client.get_tools()

    print(f"✅ Loaded {len(tools) if hasattr(tools, '__len__') else 'multiple'} tools from MCP servers")

    # Create react agent with all tools
    # Hint: Pass model and tools to create_react_agent
    agent = create_react_agent(model, tools)  # Replace both ___ with model, tools

    print("\n" + "=" * 60)
    print("TESTING MULTI-SERVER ORCHESTRATION:")
    print("=" * 60)

    # Test 1: Calculator query
    print("\nTest 1: Calculator MCP")
    calc_response = await agent.ainvoke({
        "messages": "What is 42 plus 58?"
    })
    print(f"Response: {calc_response['messages'][-1].content}")

    # Test 2: Weather query
    print("\nTest 2: Weather MCP")
    weather_response = await agent.ainvoke({
        "messages": "What's the weather in London?"
    })
    print(f"Response: {weather_response['messages'][-1].content}")

    # Test 3: Complex math
    print("\nTest 3: Complex Math")
    complex_response = await agent.ainvoke({
        "messages": "What's (3 + 5) x 12?"
    })
    print(f"Response: {complex_response['messages'][-1].content}")

    # Test 4: Another weather query
    print("\nTest 4: Weather in Multiple Cities")
    cities_response = await agent.ainvoke({
        "messages": "Compare the weather in New York and Tokyo"
    })
    print(f"Response: {cities_response['messages'][-1].content}")

    # Test 5: Mixed query
    print("\nTest 5: Mixed Query")
    mixed_response = await agent.ainvoke({
        "messages": "If it's 20°C in Paris and temperature rises by 5 degrees, what will it be?"
    })
    print(f"Response: {mixed_response['messages'][-1].content}")

# Run the multi-server agent
if __name__ == "__main__":
    print("Starting Multi-Server MCP Orchestration...")
    print("This demonstrates how a single agent can use multiple MCP servers\n")

    # Run async function
    asyncio.run(run_multi_server_agent())

    print("\n" + "=" * 60)
    print("💡 KEY CONCEPTS:")
    print("- MultiServerMCPClient manages multiple MCP servers")
    print("- Each server exposes different tools")
    print("- Agent automatically selects appropriate tools")
    print("- Seamless orchestration across servers")
    print("- Extensible to many servers and domains")
    print("=" * 60)



"""

🌐 Task 3: Multiple MCP Servers

Starting Multi-Server MCP Orchestration...
This demonstrates how a single agent can use multiple MCP servers

📦 Loading tools from multiple servers...
Processing request of type ListToolsRequest
Processing request of type ListToolsRequest
✅ Loaded 8 tools from MCP servers
/root/code/task_3_multi_servers.py:75: LangGraphDeprecatedSinceV10: create_react_agent has been moved to `langchain.agents`. Please update your import to `from langchain.agents import create_agent`. Deprecated in LangGraph V1.0 to be removed in V2.0.
  agent = create_react_agent(model, tools)  # Replace both ___ with model, tools

============================================================
TESTING MULTI-SERVER ORCHESTRATION:
============================================================

Test 1: Calculator MCP
Processing request of type CallToolRequest
Processing request of type ListToolsRequest
Response: 42 plus 58 is 100.

Test 2: Weather MCP
Processing request of type CallToolRequest
Processing request of type ListToolsRequest
Response: The current weather in London is 10°C with cloudy conditions. The humidity is at 41%, and there is a wind blowing at 12 km/h.

Test 3: Complex Math
Processing request of type CallToolRequest
Processing request of type ListToolsRequest
Processing request of type CallToolRequest
Processing request of type ListToolsRequest
Response: (3 + 5) x 12 equals 96.

Test 4: Weather in Multiple Cities
Processing request of type CallToolRequest
Processing request of type CallToolRequest
Processing request of type ListToolsRequest
Processing request of type ListToolsRequest
Response: The current weather comparison between New York and Tokyo is as follows:

New York:
- Temperature: 16°C
- Condition: Windy
- Humidity: 62%
- Wind Speed: 6 km/h

Tokyo:
- Temperature: 17°C
- Condition: Humid
- Humidity: 72%
- Wind Speed: 13 km/h

Tokyo is slightly warmer with higher humidity and stronger winds compared to New York, which is windier but less humid.

Test 5: Mixed Query
Processing request of type CallToolRequest
Processing request of type ListToolsRequest
Response: If the temperature in Paris is 20°C and it rises by 5 degrees, the new temperature will be 25°C.

============================================================
💡 KEY CONCEPTS:
- MultiServerMCPClient manages multiple MCP servers
- Each server exposes different tools
- Agent automatically selects appropriate tools
- Seamless orchestration across servers
- Extensible to many servers and domains
============================================================

"""