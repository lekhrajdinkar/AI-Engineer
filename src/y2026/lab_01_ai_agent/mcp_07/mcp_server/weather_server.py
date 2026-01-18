#!/usr/bin/env python3
"""Weather MCP Server using FastMCP

This server provides weather information tools using the official
MCP Python SDK. It uses mock data to simulate weather API responses.
"""

import random
from datetime import datetime, timedelta
from mcp.server.fastmcp import FastMCP

# Create the Weather MCP server
mcp = FastMCP("weather")

# Mock weather data for different cities
WEATHER_DATA = {
    "london": {"temp_range": (10, 20), "conditions": ["Rainy", "Cloudy", "Foggy"]},
    "paris": {"temp_range": (12, 22), "conditions": ["Sunny", "Partly Cloudy", "Clear"]},
    "tokyo": {"temp_range": (15, 25), "conditions": ["Clear", "Humid", "Partly Cloudy"]},
    "new york": {"temp_range": (8, 18), "conditions": ["Windy", "Clear", "Cloudy"]},
    "san francisco": {"temp_range": (14, 20), "conditions": ["Foggy", "Clear", "Cool"]},
    "berlin": {"temp_range": (5, 15), "conditions": ["Cloudy", "Rainy", "Overcast"]},
    "sydney": {"temp_range": (18, 28), "conditions": ["Sunny", "Clear", "Warm"]},
    "mumbai": {"temp_range": (25, 35), "conditions": ["Hot", "Humid", "Monsoon"]},
}


@mcp.tool()
def get_current_weather(city: str = "London") -> str:
    """Get current weather for a city

    Args:
        city: Name of the city (default: London)

    Returns:
        Current weather information including temperature, condition, humidity, and wind
    """
    city_lower = city.lower()

    # Get weather data or use default
    weather_info = WEATHER_DATA.get(city_lower, WEATHER_DATA["london"])
    temp_min, temp_max = weather_info["temp_range"]
    conditions = weather_info["conditions"]

    # Generate mock weather
    temperature = random.randint(temp_min, temp_max)
    condition = random.choice(conditions)
    humidity = random.randint(40, 80)
    wind_speed = random.randint(5, 25)

    return (
        f"Weather in {city.title()}:\n"
        f"🌡️ Temperature: {temperature}°C\n"
        f"☁️ Condition: {condition}\n"
        f"💧 Humidity: {humidity}%\n"
        f"💨 Wind: {wind_speed} km/h"
    )


@mcp.tool()
def get_forecast(city: str = "London", days: int = 3) -> str:
    """Get weather forecast for next few days

    Args:
        city: Name of the city (default: London)
        days: Number of days to forecast (default: 3, max: 7)

    Returns:
        Weather forecast for the specified number of days
    """
    city_lower = city.lower()

    # Get weather data or use default
    weather_info = WEATHER_DATA.get(city_lower, WEATHER_DATA["london"])
    temp_min, temp_max = weather_info["temp_range"]
    conditions = weather_info["conditions"]

    forecast_lines = [f"Forecast for {city.title()}:"]
    today = datetime.now()

    for i in range(min(days, 7)):  # Max 7 days
        date = today + timedelta(days=i + 1)
        temp = random.randint(temp_min, temp_max)
        condition = random.choice(conditions)
        forecast_lines.append(f"📅 {date.strftime('%A, %B %d')}: {temp}°C, {condition}")

    return "\n".join(forecast_lines)


@mcp.tool()
def get_temperature(city: str = "London") -> str:
    """Get just the temperature for a city

    Args:
        city: Name of the city (default: London)

    Returns:
        Current temperature in the city
    """
    city_lower = city.lower()

    weather_info = WEATHER_DATA.get(city_lower, WEATHER_DATA["london"])
    temp_min, temp_max = weather_info["temp_range"]
    temperature = random.randint(temp_min, temp_max)

    return f"Current temperature in {city.title()}: {temperature}°C"


@mcp.tool()
def compare_weather(city1: str = "London", city2: str = "Paris") -> str:
    """Compare weather between two cities

    Args:
        city1: First city (default: London)
        city2: Second city (default: Paris)

    Returns:
        Weather comparison between the two cities
    """
    city1_lower = city1.lower()
    city2_lower = city2.lower()

    # Get weather for both cities
    weather1 = WEATHER_DATA.get(city1_lower, WEATHER_DATA["london"])
    weather2 = WEATHER_DATA.get(city2_lower, WEATHER_DATA["paris"])

    temp1 = random.randint(*weather1["temp_range"])
    temp2 = random.randint(*weather2["temp_range"])
    cond1 = random.choice(weather1["conditions"])
    cond2 = random.choice(weather2["conditions"])

    comparison = f"Weather Comparison:\n\n"
    comparison += f"📍 {city1.title()}:\n"
    comparison += f"  Temperature: {temp1}°C\n"
    comparison += f"  Condition: {cond1}\n\n"
    comparison += f"📍 {city2.title()}:\n"
    comparison += f"  Temperature: {temp2}°C\n"
    comparison += f"  Condition: {cond2}\n\n"

    if temp1 > temp2:
        comparison += f"🌡️ {city1.title()} is {temp1-temp2}°C warmer"
    elif temp2 > temp1:
        comparison += f"🌡️ {city2.title()} is {temp2-temp1}°C warmer"
    else:
        comparison += f"🌡️ Both cities have the same temperature"

    return comparison


if __name__ == "__main__":
    # Run the MCP server using stdio transport
    # This allows communication via standard input/output using JSON-RPC protocol
    mcp.run(transport="stdio")
