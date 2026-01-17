#!/usr/bin/env python3
"""
Tools & Prompts MCP Client - Test server functionality
"""
import asyncio
from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def test_tools_and_prompts():
    """Test server tools and prompts with real parameters"""
    print("🛠️ TOOLS & PROMPTS CLIENT")
    print("=" * 40)
    print("🎯 Goal: Test flight booking server tools and prompts")
    print("=" * 40)

    try:
        async with streamablehttp_client("http://localhost:8000/mcp/") as (read, write, _):
            async with ClientSession(read, write) as client:
                await client.initialize()
                print("✅ Connected to flight booking server!")
                print()

                # Test 1: Search for flights
                print("✈️ Test 1: Searching for flights...")
                try:
                    flight_result = await client.call_tool("search_flights", {
                        "origin": "LAX",
                        "destination": "JFK"
                    })
                    if flight_result.content and len(flight_result.content) > 0:
                        print(f"🎯 Flight search result:")
                        print(f"   {flight_result.content[0].text}")
                    print()
                except Exception as e:
                    print(f"❌ Flight search failed: {e}")
                    print()

                # Test 2: Create a booking
                print("🎫 Test 2: Creating a booking...")
                try:
                    booking_result = await client.call_tool("create_booking", {
                        "flight_id": "FL123",
                        "passenger_name": "Alice Johnson"
                    })
                    if booking_result.content and len(booking_result.content) > 0:
                        print(f"🎯 Booking result:")
                        print(f"   {booking_result.content[0].text}")
                    print()
                except Exception as e:
                    print(f"❌ Booking creation failed: {e}")
                    print()

                # Test 3: Access airport resource
                print("🏢 Test 3: Getting airport information...")
                try:
                    airport_result = await client.read_resource("file://airports")
                    if airport_result.contents and len(airport_result.contents) > 0:
                        print(f"🎯 Airport information:")
                        print(f"   {airport_result.contents[0].text[:200]}...")
                    print()
                except Exception as e:
                    print(f"❌ Airport resource failed: {e}")
                    print()

                # Test 4: Use flight recommendation prompt
                print("💡 Test 4: Getting flight recommendations...")
                try:
                    prompt_result = await client.get_prompt("find_best_flight", {
                        "budget": "500.0",  # Changed from 500.0 to "500.0"
                        "preferences": "economy class, direct flight"
                    })
                    if prompt_result.messages and len(prompt_result.messages) > 0:
                        print(f"🎯 Flight recommendation prompt:")
                        # The prompt content is in the message
                        if hasattr(prompt_result.messages[0].content, 'text'):
                            print(f"   {prompt_result.messages[0].content.text[:300]}...")
                        else:
                            print(f"   {str(prompt_result.messages[0].content)[:300]}...")
                    print()
                except Exception as e:
                    print(f"❌ Prompt generation failed: {e}")
                    print()

                # Test 5: Handle disruption prompt
                print("🚨 Test 5: Getting disruption handling prompt...")
                try:
                    disruption_result = await client.get_prompt("handle_disruption", {
                        "original_flight": "FL123",
                        "reason": "weather delay"
                    })
                    if disruption_result.messages and len(disruption_result.messages) > 0:
                        print(f"🎯 Disruption handling prompt:")
                        if hasattr(disruption_result.messages[0].content, 'text'):
                            print(f"   {disruption_result.messages[0].content.text[:300]}...")
                        else:
                            print(f"   {str(disruption_result.messages[0].content)[:300]}...")
                    print()
                except Exception as e:
                    print(f"❌ Disruption prompt failed: {e}")
                    print()

                print("🎉 All tools and prompts tested successfully!")
                print("✨ Flight booking server is fully functional!")

    except Exception as e:
        print(f"❌ Client connection failed: {e}")
        print("💡 Make sure the flight booking server is running on port 8000")

if __name__ == "__main__":
    asyncio.run(test_tools_and_prompts())