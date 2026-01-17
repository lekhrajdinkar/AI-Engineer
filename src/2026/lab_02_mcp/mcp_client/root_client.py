#!/usr/bin/env python3
"""
Roots MCP Client - Provide file system access to server
"""
import asyncio
from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from mcp.types import ListRootsResult, Root

async def test_roots_functionality():
    """Test MCP client with roots functionality"""
    print("📁 ROOTS MCP CLIENT")
    print("=" * 40)
    print("🎯 Goal: Provide file system access to server via roots")
    print("=" * 40)

    # Define project roots that the server can access
    project_roots = [
        "file:///home/lab-user/",
        "file:///home/lab-user/flight-booking-server/",
        "file:///home/lab-user/mcp-client/"
    ]

    # Define list_roots callback - this is called when server asks for available roots
    async def list_roots_callback(context):
        """Provide list of available project roots to the server"""
        print("📋 Server requested available project roots")

        roots = [Root(uri=root) for root in project_roots]
        result = ListRootsResult(roots=roots)

        print(f"📁 Providing {len(roots)} project roots to server:")
        for root in project_roots:
            print(f"   - {root}")

        return result

    try:
        async with streamablehttp_client("http://localhost:8000/mcp/") as (read, write, _):
            # Connect with roots support
            async with ClientSession(read, write, list_roots_callback=list_roots_callback) as client:
                await client.initialize()
                print("✅ Connected to server with roots support!")
                print()

                # Test 1: List available tools (should include file-related tools if server supports them)
                print("🔧 Available tools:")
                tools = await client.list_tools()
                for tool in tools.tools:
                    print(f"  - {tool.name}: {tool.description}")
                print()

                # Test 2: List available resources (should include file resources if server supports them)
                print("📊 Available resources:")
                resources = await client.list_resources()
                for resource in resources.resources:
                    print(f"  - {resource.uri}: {resource.name if hasattr(resource, 'name') else 'No description'}")
                print()

                # Test 3: Try to access a file-based resource if available
                print("📄 Testing file access capabilities...")
                try:
                    # Try to read a basic resource
                    airports_result = await client.read_resource("file://airports")
                    if airports_result.contents and len(airports_result.contents) > 0:
                        print(f"✅ Successfully accessed airports resource")
                        print(f"   Content length: {len(airports_result.contents[0].text)} characters")
                    print()
                except Exception as e:
                    print(f"⚠️  File access test: {e}")
                    print("   This is normal if server doesn't have file-specific tools")
                    print()

                # Test 4: Demonstrate that server can potentially access our provided roots
                print("🌳 Roots configuration summary:")
                print(f"📁 Provided {len(project_roots)} project roots:")
                for i, root in enumerate(project_roots, 1):
                    print(f"   {i}. {root}")
                print()
                print("💡 The server can now access files within these directories")
                print("   if it has file-related tools implemented!")
                print()

                print("🎉 Roots functionality test completed!")
                print("✨ Server now has potential access to specified directories!")

    except Exception as e:
        print(f"❌ Roots client failed: {e}")
        print("💡 Make sure the flight booking server is running on port 8000")

if __name__ == "__main__":
    asyncio.run(test_roots_functionality())

"""
📁 ROOTS MCP CLIENT
========================================
🎯 Goal: Provide file system access to server via roots
========================================
✅ Connected to server with roots support!

🔧 Available tools:
  - search_flights: Search for flights between two airports
  - create_booking: Create a flight booking

📊 Available resources:
  - file://airports/: get_airports

📄 Testing file access capabilities...
✅ Successfully accessed airports resource
   Content length: 237 characters

🌳 Roots configuration summary:
📁 Provided 3 project roots:
   1. file:///home/lab-user/
   2. file:///home/lab-user/flight-booking-server/
   3. file:///home/lab-user/mcp-client/

💡 The server can now access files within these directories
   if it has file-related tools implemented!

🎉 Roots functionality test completed!
✨ Server now has potential access to specified directories!
"""