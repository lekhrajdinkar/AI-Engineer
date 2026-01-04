# MCP (**Anthropic**)
## Overview 
- An MCP server (Model Context Protocol server) 
  - acts as a bridge between "AI models" and "external tools or data sources". 
  - It enables AI to access information and perform actions beyond its built-in knowledge. 
  - In simple terms, an MCP server translates requests from an AI model into commands that a specific tool or data source can understand and execute
- **model-agnostic**:  meaning it can work with different AI models and platforms.
- enables developers to create **AI applications** that can:
    - manage context effectively, to do intelligent reasoning and decision-making.
    - integrate with external tools,
    - handle **multi-turn conversations** seamlessly.
- AI agents empowered by MCP can **take actions** 👈🏻
  - LLM only send response 
- **Architecture** (client/server + http/stdio/rpc) 
  - **Components**:
    - **MCP Server** | hosted:  locally, cloud, k8s,  3rd-party vendors
      - 🔸Tools : actions that AI can perform (e.g., database queries, API calls, file operations)
      - 🔸resources: data sources that AI can access (e.g., documents, databases, web pages)
      - 🔸Prompts: predefined instructions/templates to guide AI interactions
    - **MCP Client** ( AI agents, act as clients connecting to MCP servers)
      - 🔸Sampling:
      - 🔸Elicitation: 
      - 🔸Root: FileSystem, DB | eg: keep user preference
    - **MCP SDK**
- **purpose**:
  - MCP makes it easy to build agents and complex workflows, powered by large language models
  - LLMs often need to connect with data and tools. And MCP provides a standard way to do that.
  - Best practices for securing your data within your own infrastructure
  
## reference:
- https://www.youtube.com/watch?v=RhTiAOGwbYE
- [MCP lab-1](https://learn.kodekloud.com/user/courses/youtube-labs-mcp?utm_source=youtube&utm_medium=video&utm_campaign=mcpcrashcourse_part1&utm_id=mcpcrashcourse_p1&utm_term=&utm_content=)
- [https://kode.wiki/4lFwf5p](https://kode.wiki/4lFwf5p)
- [https://www.perplexity.ai/search/mcp-introduction-explained-in-_WiQ4FksREuKr5HJlKqznw](https://www.perplexity.ai/search/mcp-introduction-explained-in-_WiQ4FksREuKr5HJlKqznw)
- [https://docs.anthropic.com/en/docs/mcp](https://docs.anthropic.com/en/docs/mcp)
- [bbgo links](https://github.com/lekhrajdinkar/solution-engineer/blob/main/docs/10_System_Design/blogs_01_byteByteGo.md#%EF%B8%8Fagentic-ai)

---
## POC/s
### ✔️POC-1: flight-booking-server (Built own)
```
    Lab: Using an MCP Server
    Lab: Building an MCP Server
    Lab: Building an MCP Client
    Lab: Kubernetes MCP Server
```
- [flight-booking-server](../../../src/2025/04_MCP_flightTicketAgent)
  - lab-1: https://kodekloud.com/studio/labs/artificial-intelligence/mcp-introductory-lab
  - lab-2:
- IDE: VS code with **cline** and **Roo-code** plugins
- $OPENAI_API_KEY : Sk-kkAI-5c8e136101e552a31ef9d0635ac9ba53798e25409d021f2540ae02b7a246bda6kk_omx7pfoeunlapw4o-kkf5d9ee88

```bash
uv init  flight-booking-server
cd flight-booking-server
uv add mcp[cli]
```

- `mcp[cli]` --> both sdk + mcp tools (mcp inspector)
    - mcp = FastMCP()
    - @mcp.resource("file://abc") # provide `read-only` data access to AI systems
    - @mcp.tool
    - @mcp.prompt

- configure mcp server
```json
{
    "mcpserver": {
        "flight-booking-server": {
            "command":"uv",
            "args":["run","python","server.py"]
        }
    }
}
```

### ✔️POC-2: k8s-mcp-server (vendor provided)
- docs: https://github.com/reza-gholizade/k8s-mcp-server
- manage cluster with natural language
- Just Run it inside Kubernetes cluster.
- **Status**: `in-progress`

```
docker pull ginnux/k8s-mcp-server:latest
docker images | grep k8s-mcp-server
docker inspect ginnux/k8s-mcp-server:latest
```

- configure mcp server
```
{
  "mcpServers": {
    "k8s-mcp-server": {
      "command": "sudo",
      "args": [
        "docker",
        "run",
        "-i",
        "--rm",
        "-v",
        "C:\Users\Manisha\.kube\config:/home/appuser/.kube/config:ro",
        "ginnux/k8s-mcp-server:latest",
        "--mode",
        "stdio"
      ]
    }
  }
}
```

- Key Features:
```
16 Kubernetes Tools - Complete cluster management capabilities
Pod Operations - List, describe, get logs, delete pods
Node Management - Get node information and metrics
Resource Operations - Create, update, and manage Kubernetes resources
Helm Integration - Install, upgrade, and manage Helm charts
Event Monitoring - Get cluster events and troubleshooting information
```

- Benefits:
```
Natural language cluster management
AI-powered troubleshooting
Automated resource management
Seamless integration with Roo-Code
```

- Hands on:
```
🚀 Task 1: Create an Nginx Pod

Ask Roo-Code: "Create an nginx pod with nginx image"
Verify the pod was created successfully
Check the pod status using Roo-Code

🔍 Task 2: Verify Pod Creation

Ask Roo-Code: "Show me the status of the nginx pod"
Confirm the pod is running
Check pod details and logs if needed

⚠️ Task 3: Simulate a Broken Scenario

Create a pod with an incorrect image: "Create a pod named test-pod with image BUSYYBOX"
Ask Roo-Code to identify the root cause of the issue
Use natural language to troubleshoot: "Why is my test-pod not starting?"
```

🎯 Learning Objectives:
- **creating** Kubernetes resources with AI
- Learn to **verify** resource creation
- Experience AI-powered **troubleshooting**


