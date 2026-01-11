# MCP POC
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
- $OPENAI_API_KEY :

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


