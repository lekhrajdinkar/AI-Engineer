# AI Agent : Cache problem
- https://www.youtube.com/watch?v=4Afvll6TQXA (Skip)
- https://www.betterdb.com/ | `BetterDB`

## Overview
- AI agents must manage expensive, repeated calls at 3 places:
  - language models, 
  - tool executions, (mcp)
  - session memory. 

## Types of Repeats
**Exact Repeats**
- Identical inputs and prompts. 
- These are handled by **Agent Cache** 
- which stores results to avoid redundant model/tool calls.

**Similar Repeats** 
- Questions that differ in phrasing but share the same meaning.
- These are addressed by **Semantic Cache** 
- using vector search to identify and reuse responses based on meaning.

---

> ## Try: BetterDB ⭐
> - https://www.betterdb.com/
> - It tracks metrics like hit rates, latency, and cost savings. 
> - This data is fed into an MCP server that provides actionable recommendations—such as 
>  - adjusting caching duration 
>  - semantic cache thresholds