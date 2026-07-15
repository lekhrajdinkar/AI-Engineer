# MCP labs
🏅 https://learn.kodekloud.com/user/certificate/70898c94-da67-4c49-b68e-9277561700cd

## overview
- lab: https://kode.wiki/4nkTvFD 
- KK https://youtu.be/dyt-bhxrrbk?si=dFKsfOunhuITdZrZ
- **MCP Server**: flight booking App --> created locally and run 👈🏻
- **MCP client-1**: coding Agent (cline/roo Code) [mcp.json](mcp.json) -> not worked in my local. 👈🏻
- **MCP client-2**: [mcp_client py](mcp_client) -> worked locally 👈🏻
  
---
##  Key points
- STDIO Transport: Local communication, command-based configuration
- `mcp[cli]` = MCP SDK and development tools (**MCP Inspector**)
- **Sampling** allows servers to request LLM responses from clients.
- **Elicitation** allows servers to request user input from clients. Experience true interactive MCP communication where the server can ask you for information directly.

---
## run
- FastMCP servers are NOT meant to be run standalone like FastAPI 👈🏻
- **option-1**: ✅
  - uv run mcp run server.py --transport streamable-http
- **option-2**: Run with MCP Dev Inspector
  - `uv pip install mcp` // Install MCP CLI tools
  - `mcp dev server.py` // Run server via MCP dev mode, attach JSON-RPC client 
  -  MCP Inspector is up and running at http://127.0.0.1:6274 🚀
  - **MCP_PROXY_AUTH_TOKEN**=<Session token>

```bash
cd  C:\Users\Manisha\Documents\github-2025\genai

uv init 
uv add "mcp[cli]" "fastmcp"
uv add package
uv sync

# option-1
mcp dev server.py
# option-2 ✅
uv run mcp run server.py --transport streamable-http

---

uv run python basic_client.py
...
uv run python complete_client.py

---
- Achievmnents
✅ Built basic clients for server discovery and connection
✅ Created tool-calling clients for automation
✅ Implemented advanced features: roots, sampling, elicitation
✅ Developed production-ready integration patterns
✅ Mastered async Python programming for MCP

```





