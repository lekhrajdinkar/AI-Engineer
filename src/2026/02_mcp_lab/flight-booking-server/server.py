from mcp.server.fastmcp import FastMCP

# Create an MCP server
mcp = FastMCP("Flight Booking Server")

@mcp.resource("file://airports")
def get_airports():
    """Get list of available airports"""
    return {
        "LAX": {"name": "Los Angeles International", "city": "Los Angeles"},
        "JFK": {"name": "John F. Kennedy International", "city": "New York"},
        "LHR": {"name": "London Heathrow", "city": "London"}
    }

@mcp.tool()
def search_flights(origin: str, destination: str) -> dict:
    """Search for flights between two airports"""
    return {
        "flights": [
            {"id": "FL123", "origin": origin, "destination": destination, "price": 299},
            {"id": "FL456", "origin": origin, "destination": destination, "price": 399}
        ]
    }

@mcp.tool()
def create_booking(flight_id: str, passenger_name: str) -> dict:
    """Create a flight booking"""
    return {
        "booking_id": f"BK{flight_id[-3:]}",
        "flight_id": flight_id,
        "passenger": passenger_name,
        "status": "confirmed"
    }

@mcp.prompt()
def find_best_flight(budget: float, preferences: str = "economy") -> str:
    """Generate a prompt for finding the best flight within budget"""
    return f"""Please help me find the best flight within a ${budget} budget.
    
My preferences: {preferences}

Please consider:
- Price (must be under ${budget})
- Flight duration  
- Airline reputation
- Departure times

Use the search_flights tool to find available options and provide a recommendation with reasoning."""

@mcp.prompt()
def handle_disruption(original_flight: str, reason: str) -> str:
    """Generate a prompt for handling flight disruptions"""
    return f"""A passenger's flight {original_flight} has been disrupted due to: {reason}

Please help resolve this by:
1. Understanding the passenger's situation
2. Finding alternative flight options using search_flights
3. Providing clear rebooking steps
4. Offering appropriate compensation if applicable

Be empathetic and solution-focused in your response."""

if __name__ == "__main__":
    mcp.run()
    #mcp.run(transport="http", host="127.0.0.1", port=3333)