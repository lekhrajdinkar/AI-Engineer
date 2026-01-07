# Agentic workflows ✔
## topics
  - agentic-ai
  - agentic-design-patterns
  - agentic-security
  - agentic-mlops
  - agentic-workflow-types: single-agent, multi-agent, human-in-the-loop, routing, parallelism, evaluator-optimizer, orchestrator, Truly Autonomous, etc
  - ...

## Architecture
- Component:
  - LLM 
  - MCP, A2A
  - Knowledge Base and RAG 
  - memory (user session), 
  - guardrails
  - orchestration (monitoring, logging, RT insights, etc)

## `Autonomous` Agentic AI 
- https://www.youtube.com/watch?v=SYHqSAWQ4NY&list=PLJq-63ZRPdBu38EjXRXzyPat3sYMHbIWU&index=11
  - Analyze Surrounding
  - Make Decision
  - Execute Action
  - No human instruction, feedback, etc.
  - Not 100% reliable.
  - Analogy: 
    - ![img.png](../../99_img/bm/llm/11/img.png)

- **LAM vs Autonomous Agents**
  - ![img_1.png](../../99_img/bm/llm/11/img_1.png)
  
- **Open-Source Projects**:
  - LaVague:
    - An open-source framework designed for developers
    - to create AI Web Agents that automate processes for end-users. 
    - LaVague agents can interpret objectives and generate actions to achieve them, utilizing a World Model and an Action Engine.
    - https://github.com/lavague-ai/LaVague

  - SuperAGI:
    - A developer-first open-source autonomous AI agent framework that enables 
    - building, managing, and running useful autonomous agents. SuperAGI supports concurrent agents, 
    - extends capabilities with tools, and allows agents to perform various tasks, improving performance over time.
    - https://github.com/TransformerOptimus...

  - AutoGen:
    - An open-source framework for building AI agent systems, simplifying the creation of event-driven,
    - distributed, scalable, and resilient agentic applications. AutoGen facilitates collaboration among AI agents
    - to perform tasks autonomously or with human oversight.
    - https://github.com/microsoft/autogen

- **Application**
  - ![img_2.png](../../99_img/bm/llm/11/img_2.png)

