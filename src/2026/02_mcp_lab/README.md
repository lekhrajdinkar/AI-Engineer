# MCP labs
## overview
- lab: https://kode.wiki/4nkTvFD 
- KK https://youtu.be/dyt-bhxrrbk?si=dFKsfOunhuITdZrZ
- **MCP Server**: flight booking App 
- **MCP client**: coding Agent (cline/roo Code): 
  - Reason step-by-step
  - Use tools
  - Remember context
  
---
##  Key points
- STDIO Transport: Local communication, command-based configuration
- MCP Components: Resources (data), Tools (actions), Prompts (guidance)
- AI Integration: Seamless connection between MCP servers and AI assistants
- Data Extraction: Using AI to query and extract specific information from MCP servers
- `mcp[cli]` = MCP SDK and development tools (MCP Inspector)

---
## run
```bash
#---old---
pip install package	
python -m venv env	
pip install -r requirements.txt	

#---new---
uv add package
uv init project
uv sync

uv init flight-booking-server
cd flight-booking-server
uv add "mcp[cli]"
```


