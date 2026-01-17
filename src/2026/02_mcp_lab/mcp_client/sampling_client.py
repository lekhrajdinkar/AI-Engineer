#!/usr/bin/env python3
"""
Sampling MCP Client - Handle server LLM requests
"""
import asyncio
from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from mcp.types import CreateMessageRequestParams, CreateMessageResult, TextContent

async def handle_sampling(context, params: CreateMessageRequestParams) -> CreateMessageResult:
    """Handle sampling requests from server - provide simulated LLM responses"""
    print("🤖 Server requests LLM generation!")

    # Extract the prompt from the message chain
    messages = params.messages
    user_messages = [msg for msg in messages if msg.role == "user"]

    if user_messages:
        # Get the last user message as the prompt
        prompt = user_messages[-1].content.text if hasattr(user_messages[-1].content, 'text') else str(user_messages[-1].content)
        print(f"📝 Prompt: {prompt}")

        # Generate contextual responses based on prompt content
        if "poem" in prompt.lower():
            response = """Here's a poem about travel:
            
Flying high above the clouds so white,
Adventure calls from left and right,
Booking flights with digital ease,
Exploring worlds across the seas."""
        elif "explain" in prompt.lower() and ("flight" in prompt.lower() or "travel" in prompt.lower()):
            response = """Flight booking systems help travelers find and reserve airline seats. They connect to airline databases, compare prices, check availability, and handle payments. Modern systems use APIs to provide real-time information and seamless booking experiences."""
        elif "story" in prompt.lower():
            response = """Once upon a time, there was a traveler named Sam who used an innovative flight booking system. With just a few clicks, Sam found the perfect flight, selected a window seat, and received instant confirmation. The journey that followed was filled with wonder and adventure."""
        elif "recommend" in prompt.lower() or "suggest" in prompt.lower():
            response = """Based on your preferences, I recommend:
1. Book flights in advance for better prices
2. Consider flexible dates for more options  
3. Check multiple airlines for the best deals
4. Look into travel insurance for peace of mind
5. Arrive at the airport with plenty of time"""
        else:
            response = f"Here's a helpful response about flight booking and travel: {prompt}"

        print(f"🎭 Generated response: {response[:100]}...")

        return CreateMessageResult(
            role="assistant",
            content=TextContent(type="text", text=response),
            model="simulated-llm",
            stopReason="endTurn"
        )

    # Fallback response
    return CreateMessageResult(
        role="assistant",
        content=TextContent(type="text", text="I couldn't generate a response for that request."),
        model="simulated-llm",
        stopReason="endTurn"
    )

async def test_sampling():
    """Test MCP sampling - server requests LLM generation through client"""
    print("🎭 SAMPLING MCP CLIENT")
    print("=" * 40)
    print("🎯 Goal: Handle server LLM sampling requests")
    print("=" * 40)

    try:
        async with streamablehttp_client("http://localhost:8000/mcp/") as (read, write, _):
            # Connect with sampling support
            async with ClientSession(read, write, sampling_callback=handle_sampling) as client:
                await client.initialize()
                print("✅ Connected to server with sampling support!")
                print()

                # List available tools to see if server has sampling-enabled tools
                print("🔧 Checking for sampling-enabled tools...")
                tools = await client.list_tools()

                sampling_tools = []
                for tool in tools.tools:
                    if any(keyword in tool.description.lower() for keyword in ['generate', 'create', 'write', 'compose']):
                        sampling_tools.append(tool)
                        print(f"  📝 {tool.name}: {tool.description}")

                if not sampling_tools:
                    print("  ⚠️  No obvious sampling-enabled tools found")
                    print("     This is normal - the basic flight server doesn't have LLM tools")
                print()

                # Try to trigger sampling by calling tools that might use LLM
                print("🧪 Testing potential sampling scenarios...")

                # Test existing prompts (they might trigger sampling internally)
                try:
                    print("💡 Testing flight recommendation prompt...")
                    prompt_result = await client.get_prompt("find_best_flight", {
                        "budget": "800.0",  # Changed from 800.0 to "800.0"
                        "preferences": "business class, direct flight"
                    })
                    print("✅ Prompt generated successfully (no sampling required)")
                    print()
                except Exception as e:
                    print(f"⚠️  Prompt test: {e}")
                    print()

                # Demonstrate sampling capability
                print("🎭 Sampling callback is ready!")
                print("   If the server had tools that use ctx.session.create_message(),")
                print("   our sampling callback would handle those requests.")
                print()
                print("📋 Sampling callback features:")
                print("   - Handles travel explanation requests")
                print("   - Provides travel/flight explanations")
                print("   - Creates stories and recommendations")
                print("   - Returns contextual responses")
                print()

                print("🎉 Sampling client test completed!")
                print("✨ Ready to handle server LLM requests!")

    except Exception as e:
        print(f"❌ Sampling client failed: {e}")
        print("💡 Make sure the flight booking server is running on port 8000")

if __name__ == "__main__":
    asyncio.run(test_sampling())

"""
🤖 Sampling scenarios handled:
Travel explanation requests
Story creation requests
General recommendation requests



🎭 SAMPLING MCP CLIENT
========================================
🎯 Goal: Handle server LLM sampling requests
========================================
✅ Connected to server with sampling support!

🔧 Checking for sampling-enabled tools...
  📝 create_booking: Create a flight booking

🧪 Testing potential sampling scenarios...
💡 Testing flight recommendation prompt...
✅ Prompt generated successfully (no sampling required)

🎭 Sampling callback is ready!
   If the server had tools that use ctx.session.create_message(),
   our sampling callback would handle those requests.

📋 Sampling callback features:
   - Handles travel explanation requests
   - Provides travel/flight explanations
   - Creates stories and recommendations
   - Returns contextual responses

🎉 Sampling client test completed!
✨ Ready to handle server LLM requests!
"""