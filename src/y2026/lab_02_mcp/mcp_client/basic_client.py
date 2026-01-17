#!/usr/bin/env python3
"""
Basic MCP Client - Connect and discover server capabilities
"""
import asyncio
from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def test_basic_connection():
    """Test basic connection to MCP server and list capabilities"""
    print("🔌 BASIC MCP CLIENT")
    print("=" * 40)
    print("🎯 Goal: Connect to flight booking server and discover capabilities")
    print("=" * 40)

    try:
        # Connect to the flight booking server from Lab 3
        async with streamablehttp_client("http://localhost:8000/mcp/") as (read, write, _):
            async with ClientSession(read, write) as client:
                await client.initialize()
                print("✅ Connected to MCP server successfully!")
                print()

                # 1. List available tools
                print("🔧 Available Tools:")
                tools = await client.list_tools()
                for tool in tools.tools:
                    print(f"  - {tool.name}: {tool.description}")
                print()

                # 2. List available resources
                print("📊 Available Resources:")
                resources = await client.list_resources()
                for resource in resources.resources:
                    print(f"  - {resource.uri}: {resource.name}")
                print()

                # 3. List available prompts
                print("💬 Available Prompts:")
                prompts = await client.list_prompts()
                for prompt in prompts.prompts:
                    print(f"  - {prompt.name}: {prompt.description}")
                print()

                print("🎉 Basic client connection successful!")
                print("✨ Server capabilities discovered successfully!")

    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("💡 Make sure the flight booking server is running on port 8000")

if __name__ == "__main__":
    asyncio.run(test_basic_connection())


"""
    🔌 BASIC MCP CLIENT
========================================
🎯 Goal: Connect to flight booking server and discover capabilities
========================================
✅ Connected to MCP server successfully!

🔧 Available Tools:
  - search_flights: Search for flights between two airports
  - create_booking: Create a flight booking

📊 Available Resources:
  - file://airports/: get_airports

💬 Available Prompts:
  - find_best_flight: Generate a prompt for finding the best flight within budget
  - handle_disruption: Generate a prompt for handling flight disruptions

🎉 Basic client connection successful!
✨ Server capabilities discovered successfully!

"""