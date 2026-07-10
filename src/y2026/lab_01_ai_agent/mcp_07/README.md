# Advance MCP lab
## overview
- agent(mcp-client in it) with no langGraph
- [03_01_MCP.md](../../../../docs/2026/02_AgenticAI/03_protocol/03_01_MCP.md)
```
START → MCP Basics → Integration → Orchestration → COMPLETE!
  ↓         ↓            ↓              ↓
Learn    Connect      Multiple       Master
Tools    to Graphs    Servers        MCP!
```

- **KEY CONCEPTS**
    - **MultiServerMCPClient** connects to MCP servers
    - Tools have type hints for parameters
    - client.get_tools() loads tools from servers
    - `create_react_agent` builds agent with tools
    - Agent automatically routes to appropriate tools
    - MCP handles tool execution transparently
    - Multiple servers work together, intelligent routing is key, extensible architecture
    - production mcp servers run with `mcp.run()`

- **Tool Naming Convention**
    ```
    mcp__<server_name>__<tool_name>
    Examples:
    - mcp__calculator__add
    - mcp__weather__get_forecast
    ```

---
## tasks
- **Task 1**: Basic MCP server (no LangGraph)
- **Task 2**: Single server + LangGraph
- **Task 3**: Multiple servers + orchestration

```
├── task_1_mcp_basics.py              # Basic MCP server
├── task_2_mcp_langgraph.py           # MCP + LangGraph
├── task_3_multi_servers.py           # Multi-server orchestration
├── mcp_servers
│   ├── calculator_server.py          # Standalone calculator
│   └── weather_server.py             # Standalone weather
└── verify_environment.py              # Environment checker

```


### Task 1: Understanding MCP Basics 📡
Create a **simple calculator MCP server** 

```python
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
```

---
### Task 2: MCP and LangGraph Integration 🔌
**Concept:** Connect MCP servers to LangGraph agents

**Actions**
- Bind MCP tools to LLM
- Create intelligent routing
- Handle tool responses
- Integrate with StateGraph

```python
# ╔════════════════════════════════════════╗
# ║   MCP + LangGraph Integration Flow     ║
# ╚════════════════════════════════════════╝
#
#        [User Query]
#             │
#             ▼
#     ┌───────────────┐
#     │ LangGraph     │
#     │ React Agent   │
#     └───────┬───────┘
#             │
#       ┌─────┴─────┐
#       │MCP Client │
#       └─────┬─────┘
#             │
#       ┌─────┴─────┐
#       ▼           ▼
# ┌──────────┐ ┌─────────┐
# │MCP Server│ │   LLM   │
# │Calculator│ │Response │
# │   🔢     │ │   💬    │
# └──────────┘ └─────────┘
#
# MCP Tool Naming Convention:
# When tools are loaded, they follow pattern:
# Original: add, multiply
# In Agent: Automatically handled by MCP adapter
```

---
### Task 3: Multiple MCP Servers 🌐
**Concept:** Orchestrate multiple specialized MCP servers

**Actions**
- Create calculator and weather servers
- Implement smart routing logic
- Handle different server responses
- Build unified orchestration

```python
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
```
---


## Environment Setup and run
```bash
pip install langgraph langchain langchain-openai langchain-mcp-adapters mcp
```
- **Required Packages**
  - `langgraph` - Stateful graph framework
  - `langchain` - Core LLM abstractions
  - `langchain-openai` - OpenAI integration
  - `langchain-mcp-adapters` - MCP integration for LangChain
  - `mcp` - Model Context Protocol SDK (includes FastMCP)

- **Environment Variables**
  - `OPENAI_API_BASE` - Proxy endpoint for LLM access
  - `OPENAI_API_KEY` - Authentication
  - `OPENAI_MODEL` - Default model (gpt-4.1-mini)

- **Run**
```bash
#---1
# start mcp1 (my-basic-mcp : calculator)
python -m src.y2026.lab_01_ai_agent.mcp_07.task_1_mcp_basics
# start agent-1 (simgle mcp - calculator)
python -m src.y2026.lab_01_ai_agent.mcp_07.task_2_mcp_langgraph

#---2
# Start MCP/s
python -m src.y2026.lab_01_ai_agent.mcp_07.mcp_server.calculator_servers
python -m src.y2026.lab_01_ai_agent.mcp_07.mcp_server.weather_servers
# start agent-2 (multiple mcp/s as above - calculator + weather)
python -m src.y2026.lab_01_ai_agent.mcp_07.task_3_multi_servers
```

---
## Next Steps
**Advanced MCP Patterns:**
- 🗄️ Resource exposure and consumption
- 💾 Persistent state across sessions
- 👤 Human-in-the-loop approvals
- 🔄 Streaming responses
- 🚀 Production deployment with real MCP

---
## 📚 Additional Resources
- [MCP Documentation](https://modelcontextprotocol.io/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangChain Documentation](https://python.langchain.com/docs/)
