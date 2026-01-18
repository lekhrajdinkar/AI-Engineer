#!/usr/bin/env python3
"""Calculator MCP Server using FastMCP

This server provides mathematical calculation tools using the official
MCP Python SDK. It demonstrates how to create a production-ready MCP
server with multiple tools.
"""

from mcp.server.fastmcp import FastMCP

# Create the Calculator MCP server
mcp = FastMCP("calculator")


@mcp.tool()
def add(a: float, b: float) -> float:
    """Add two numbers together

    Args:
        a: First number
        b: Second number

    Returns:
        The sum of a and b
    """
    return a + b


@mcp.tool()
def multiply(a: float, b: float) -> float:
    """Multiply two numbers

    Args:
        a: First number
        b: Second number

    Returns:
        The product of a and b
    """
    return a * b


@mcp.tool()
def divide(a: float, b: float) -> str:
    """Divide two numbers with zero check

    Args:
        a: Numerator
        b: Denominator

    Returns:
        Result of division or error message if dividing by zero
    """
    if b == 0:
        return "Error: Cannot divide by zero"
    result = a / b
    return f"{a} ÷ {b} = {result}"


@mcp.tool()
def power(base: float, exponent: float) -> float:
    """Raise a number to a power

    Args:
        base: The base number
        exponent: The exponent

    Returns:
        base raised to the power of exponent
    """
    return base ** exponent


if __name__ == "__main__":
    # Run the MCP server using stdio transport
    # This allows communication via standard input/output using JSON-RPC protocol
    mcp.run(transport="stdio")
