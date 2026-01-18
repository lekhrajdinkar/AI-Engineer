- MCP : a standardized way for models to interact with databases, APIs, and services.
- Extend LangGraph agents with MCP servers - from simple calculator tools to orchestrating multiple services
- production servers run with `mcp.run()`
- Tools have type hints for parameters
- **start mcp1**: python -m src.y2026.lab_01_ai_agent.mcp_07.task_1_mcp_basics
- **start agent-1**: python -m src.y2026.lab_01_ai_agent.mcp_07.task_2_mcp_langgraph
- **start agent-2**: python -m src.y2026.lab_01_ai_agent.mcp_07.task_3_multi_servers

```

============================================================
💡 KEY CONCEPTS:
- MultiServerMCPClient connects to MCP servers
- client.get_tools() loads tools from servers
- create_react_agent builds agent with tools
- Agent automatically routes to appropriate tools
- MCP handles tool execution transparently
============================================================

```
- Multiple servers work together, intelligent routing is key, extensible architecture

---

## tasks
### Task 1: Understanding MCP Basics 📡
**File:** `task_1_mcp_basics.py` (100 lines)

**Concept:** Introduction to Model Context Protocol servers

**What You'll Do:**
- Create a simple calculator MCP server
- Define tools using @tool decorator
- Understand server initialization
- Test tools independently

**3 TODOs:**
- **Line 65:** Complete tool parameters: `{"a": float, "b": float}`
- **Line 90:** Create multiply tool: `"multiply"`
- **Line 135:** Initialize server: `name="calculator"`

**Key Learning:** MCP servers expose tools, tools have schemas, responses are structured

---

### Task 2: MCP and LangGraph Integration 🔌
**File:** `task_2_mcp_langgraph.py` (120 lines)

**Concept:** Connect MCP servers to LangGraph agents

**What You'll Do:**
- Bind MCP tools to LLM
- Create intelligent routing
- Handle tool responses
- Integrate with StateGraph

**3 TODOs:**
- **Line 78:** Initialize server: `name="calculator"`
- **Line 88:** Tool naming: `"mcp__calculator__add"`
- **Line 126:** Router condition: `if state["query_type"] == "math"`

**Key Learning:** MCP tools integrate via binding, naming convention matters, routing enables selection

---

### Task 3: Multiple MCP Servers 🌐
**File:** `task_3_multi_servers.py` (140 lines)

**Concept:** Orchestrate multiple specialized MCP servers

**What You'll Do:**
- Create calculator and weather servers
- Implement smart routing logic
- Handle different server responses
- Build unified orchestration

**3 TODOs:**
- **Line 96:** Initialize calculator: `name="calculator"`
- **Line 166:** Route to weather: `server = "weather"`
- **Line 233:** Call forecast tool: `await get_forecast({"city": city})`

**Key Learning:** Multiple servers work together, intelligent routing is key, extensible architecture

---

## 🔑 Key Concepts

### MCP Architecture
```
┌─────────────────┐     MCP Protocol    ┌─────────────────┐
│   AI Assistant  │◄────────────────────►│   MCP Server    │
│   (LangGraph)   │   stdio/SSE/HTTP    │  (Your Tools)   │
└─────────────────┘                      └─────────────────┘
```

### Tool Naming Convention
```
mcp__<server_name>__<tool_name>
Examples:
- mcp__calculator__add
- mcp__weather__get_forecast
```

### Progressive Complexity
- **Task 1**: Basic MCP server (no LangGraph)
- **Task 2**: Single server + LangGraph
- **Task 3**: Multiple servers + orchestration

## 🚦 Getting Started

### 1. Environment Setup
```bash
# Activate virtual environment
cd /root && source /root/venv/bin/activate

# Install dependencies
pip install langgraph langchain langchain-openai langchain-mcp-adapters mcp

# Verify environment
python3 /root/code/verify_environment.py
```

### 2. Required Packages
- `langgraph` - Stateful graph framework
- `langchain` - Core LLM abstractions
- `langchain-openai` - OpenAI integration
- `langchain-mcp-adapters` - MCP integration for LangChain
- `mcp` - Model Context Protocol SDK (includes FastMCP)

### 3. Environment Variables
Pre-configured in the container:
- `OPENAI_API_BASE` - Proxy endpoint for LLM access
- `OPENAI_API_KEY` - Authentication
- `OPENAI_MODEL` - Default model (gpt-4.1-mini)

## 📂 File Structure

```
/root/code/
├── task_1_mcp_basics.py              # Basic MCP server
├── task_2_mcp_langgraph.py           # MCP + LangGraph
├── task_3_multi_servers.py           # Multi-server orchestration
├── mcp_servers/
│   ├── calculator_server.py          # Standalone calculator
│   └── weather_server.py             # Standalone weather
└── verify_environment.py              # Environment checker

/root/markers/
├── task1_mcp_basics_complete.txt
├── task2_integration_complete.txt
└── task3_multi_servers_complete.txt
```

## 🏃 Running the Lab

Execute tasks in sequential order:

```bash
# Task 1: MCP Basics
python3 /root/code/task_1_mcp_basics.py

# Task 2: MCP + LangGraph
python3 /root/code/task_2_mcp_langgraph.py

# Task 3: Multiple Servers
python3 /root/code/task_3_multi_servers.py
```

## 🧪 Testing Standalone Servers

You can test the MCP servers independently:

```bash
# Test calculator server
python3 /root/code/mcp_servers/calculator_server.py --test

# Test weather server
python3 /root/code/mcp_servers/weather_server.py --test
```

## ✅ Success Criteria

Each task creates a marker file when completed:
- ✅ `task1_mcp_basics_complete.txt` - MCP server created
- ✅ `task2_integration_complete.txt` - LangGraph integration working
- ✅ `task3_multi_servers_complete.txt` - Multi-server orchestration complete

## 🎯 Expected Outcomes

By completing this lab, you'll understand:

1. **MCP Fundamentals**
    - Server creation and initialization
    - Tool definition with decorators
    - Response structure and protocols

2. **LangGraph Integration**
    - Binding MCP tools to LLMs
    - Tool naming conventions
    - Routing to appropriate servers

3. **Multi-Server Orchestration**
    - Managing multiple MCP servers
    - Intelligent query routing
    - Unified response handling

## 💡 Tips for Success

1. **Start with Task 1** - Understand MCP basics before integration
2. **Read the Hints** - Each TODO has a clear hint
3. **Check Line Numbers** - TODOs specify exact lines to edit
4. **Watch Console Output** - See how queries flow through the system
5. **Test Incrementally** - Run each task to verify it works

## 🆘 Troubleshooting

### Common Issues:

**Import Error:**
```bash
# Solution: Install required packages
pip install langgraph langchain langchain-openai
```

**Tool Not Found:**
```python
# Problem: Wrong tool naming
"calculator__add"  # ❌ Wrong

# Solution: Use MCP naming convention
"mcp__calculator__add"  # ✅ Correct
```

**Router Error:**
```python
# Problem: Router returns unexpected value
# Solution: Ensure router returns exact node names
```

## 🏆 Challenge Extensions

Once you complete all 3 tasks, try these extensions:

1. **Add More Tools**
    - Square root calculator
    - Weather alerts
    - Temperature converter

2. **Enhance Routing**
    - Use LLM for classification
    - Add confidence scoring
    - Handle ambiguous queries

3. **Create New Servers**
    - Database query server
    - File system server
    - API integration server

## 📖 Your Learning Journey

```
START → MCP Basics → Integration → Orchestration → COMPLETE!
  ↓         ↓            ↓              ↓
Learn    Connect      Multiple       Master
Tools    to Graphs    Servers        MCP!
```

## 🎉 What You've Achieved

By completing this lab, you've mastered:

✅ **MCP server creation and tool definition**
✅ **Integrating MCP with LangGraph agents**
✅ **Orchestrating multiple specialized servers**
✅ **Building extensible AI tool architectures**

**Key Achievement:** You've learned how to extend LangGraph agents with external tools using MCP! 🚀

## 🔥 Next Steps

**Advanced MCP Patterns:**
- 🗄️ Resource exposure and consumption
- 💾 Persistent state across sessions
- 👤 Human-in-the-loop approvals
- 🔄 Streaming responses
- 🚀 Production deployment with real MCP

## 🔗 MCP in Production

Use the real MCP implementations:

```python
# Production code with real MCP packages
from mcp.server.fastmcp import FastMCP
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent

# Create real MCP server
mcp = FastMCP("calculator")

@mcp.tool()
async def add(a: float, b: float) -> float:
    return a + b

# Connect multiple servers to LangGraph
client = MultiServerMCPClient({
    "calculator": {
        "command": "python",
        "args": ["calculator_server.py"],
        "transport": "stdio"
    }
})
```

## 📚 Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangChain Documentation](https://python.langchain.com/docs/)

---

**Happy Learning!** 🕸️

*Remember: MCP is the bridge between AI and the world - master it to build powerful agents!*