#!/usr/bin/env python3
"""Task 1: Understanding MCP Basics - Your first MCP server"""

import os
import asyncio
from typing import Any

# ╔════════════════════════════════════════╗
# ║     Model Context Protocol (MCP)      ║
# ╚════════════════════════════════════════╝
#
# What is MCP?
# ------------
# MCP is like a USB port for AI - a standard way for
# AI models to connect to external tools and data sources.
#
# ┌─────────────────┐     MCP Protocol    ┌─────────────────┐
# │   AI Assistant  │◄────────────────────►│   MCP Server    │
# │   (LangGraph)   │   stdio/SSE/HTTP    │  (Your Tools)   │
# └─────────────────┘                      └─────────────────┘
#
# MCP Server Components:
# ┌──────────────────────────────────────┐
# │          MCP Server                  │
# ├──────────────────────────────────────┤
# │ 1. Tools (Functions)                 │
# │    └─ add, multiply, divide          │
# │ 2. Resources (Optional)              │
# │    └─ Files, data, configs           │
# │ 3. Prompts (Optional)                │
# │    └─ Pre-defined templates          │
# └──────────────────────────────────────┘

print("📡 Task 1: Understanding MCP Basics\n")

from mcp.server.fastmcp import FastMCP

# Initialize the MCP server
mcp = FastMCP("Calculator")

@mcp.tool()
def add(a: float, b: float) -> float:
    """Add two numbers together"""
    result = a + b
    print(f"  🔧 Tool 'add' called with a={a}, b={b}")
    print(f"  ➕ Result: {result}")
    return result

@mcp.tool()
def multiply(a: float, b: float) -> float:
    """Multiply two numbers"""
    result = a * b
    print(f"  🔧 Tool 'multiply' called with a={a}, b={b}")
    print(f"  ✖️ Result: {result}")
    return result

@mcp.tool()
def divide(a: float, b: float) -> str:
    """Divide two numbers with zero check"""
    print(f"  🔧 Tool 'divide' called with a={a}, b={b}")

    if b == 0:
        print("  ❌ Error: Division by zero!")
        return "Error: Cannot divide by zero"

    result = a / b
    print(f"  ➗ Result: {result}")
    return f"{a} ÷ {b} = {result}"

def test_tools():
    """Test our MCP tools directly"""
    print("\nTest 1: Addition")
    result = add(5, 3)
    print(f"Response: {result}")

    print("\nTest 2: Multiplication")
    result = multiply(4, 7)
    print(f"Response: {result}")

    print("\nTest 3: Division")
    result = divide(10, 2)
    print(f"Response: {result}")

    print("\nTest 4: Division by zero")
    result = divide(5, 0)
    print(f"Response: {result}")


def start_mcp():
    print("🚀 STARTING MCP SERVER")
    mcp.run(transport="stdio")

if "__main__" == __name__:
    start_mcp()