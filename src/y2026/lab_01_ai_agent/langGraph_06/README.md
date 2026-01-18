# langGraph Lab
## Overview
- [05_01_langGraph.md](../../../../docs/2026/02_AgenticAI/05_01_langGraph.md)
```
START → Imports → Nodes → Edges → Flows → Routing → Calculator → Research Agent → COMPLETE!
  ↓        ↓        ↓       ↓       ↓        ↓          ↓            ↓
Learn   Create   Connect  Multi   Dynamic   LLM      Multiple    You're a
Basics  Functions Graph    Step   Decisions  Tool     Tools      LangGraph Pro!
```
---
## Environment Setup and run

- **Required Packages**
```bash
pip install langgraph langchain langchain-openai duckduckgo-search
```
- `langgraph` - Stateful graph framework
- `langchain` - Core LLM abstractions
- `langchain-openai` - OpenAI integration
- `duckduckgo-search` - Free web search (no API key needed!)

- **Environment Variables**
  - `OPENAI_API_BASE` - Proxy endpoint for LLM access
  - `OPENAI_API_KEY` - Authentication
  - `OPENAI_MODEL` - Default model (gpt-4.1-mini)

- **Run**
```bash
cd C:\Users\Manisha\Documents\github-2025\genai
python -m src.y2026.lab_01_ai_agent.langGraph_06.langgraph_test
```

---
## Tasks
check task 6 and task 7 only in future  👈🏻👈🏻👈🏻

```
├── task_1_understanding_imports.py    # Learn imports (44 lines)
├── task_2_creating_nodes.py          # Create nodes (61 lines)
├── task_3_connecting_edges.py        # Build graph (70 lines)
├── task_4_complete_flow.py           # Multi-step (86 lines)
├── task_5_conditional_routing.py     # Routing (115 lines)
├── task_6_calculator_tool.py         # Calculator (124 lines)
├── task_7_research_agent.py          # Full agent (146 lines)
```

### Task 1: Understanding Imports 📦
- Import StateGraph and END from langgraph.graph
- Import TypedDict from typing
- Define your first State class with messages list
- Understand the building blocks WITHOUT execution
```
from langgraph.graph import StateGraph, END
from typing          import TypedDict

# ╔════════════════════════════════════════╗
# ║     LangGraph Import Structure         ║
# ╠════════════════════════════════════════╣
# ║                                        ║
# ║  langgraph.graph                       ║
# ║      ├── StateGraph (Class)           ║
# ║      │    └─ Creates workflow graphs  ║
# ║      └── END (Constant)               ║
# ║           └─ Marks graph termination  ║
# ║                                        ║
# ║  typing.TypedDict                      ║
# ║      └── For defining State structure ║
# ║           └─ Type-safe state schema   ║
# ║                                        ║
# ╚════════════════════════════════════════╝
```

---
### Task 2: Creating Nodes ⚙️
- nodes are py functions that transform state
- Take state as input, Return partial updates, LangGraph handles merging
  - Create **greet_node** that generates a greeting
  - Create **enhance_node** that adds decorations
  - Test nodes manually **WITHOUT** a graph

---
### Task 3: Connecting Edges 🔗
- **concept**: Build your first complete graph with edges
- **Action**:
  - Create your first StateGraph
  - Add nodes using `add_node`
  - Connect nodes with `add_edge`
  - Set entry point and compile `set_entry_point`
  - mark END
  - Compile: Converts graph to executable app

---
### Task 4: Complete Flow 🎯
- Multi-step document processing workflow
- Each node builds on previous results

---
### Task 5: Conditional Routing 🔀
- Dynamic path selection based on state
- Master `add_conditional_edges`

---
### Task 6: Calculator Tool 🧮
**Concept:** First LLM integration as a calculator

**Actions**
- Classify queries as math or non-math
- Route to calculator_node for math queries
- Use LLM to solve calculations : `llm_with_calculator = llm.bind_tools([calculator_tool])`
- Handle non-math queries gracefully

---
### Task 7: Research Agent 🔬
**Concept:** Complete assistant with multiple tools

**Actions**
- Initialize DuckDuckGo search
- Classify queries as math or search
- Route to calculator for math
- Route to web search for information
- Build a complete research assistant!

---
## 🔥 Next Steps
### Advanced LangGraph Patterns
- 🧠 Memory systems for conversation history
- 👤 Human-in-the-Loop workflows
- 🔄 Self-improvement loops with validation
- 🤖 Multi-agent collaboration
- 🚀 Production deployment patterns

### 🏆 Challenge Extensions
1. **Add More Tools**
    - Weather API for weather queries
    - News API for current events
    - Database lookup for structured data

2. **Improve Classification**
    - Use LLM to classify queries (more accurate)
    - Add confidence scores to routing
    - Handle edge cases gracefully

3. **Add Validation**
    - Grade search results for relevance
    - Loop back if results are poor
    - Implement fallback strategies
   
### 📚 Additional Resources
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangGraph Tutorials](https://github.com/langchain-ai/langgraph/tree/main/examples)
- [LangChain Documentation](https://python.langchain.com/docs/)

