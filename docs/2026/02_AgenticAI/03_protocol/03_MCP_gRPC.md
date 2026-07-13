# MCP gRPC
- https://youtu.be/R_wdwOkcMfE?si=dTLzOkqB9DTQgrYm

##  Core Problem
MCP Purpose: 
- Originally created by Anthropic to solve **integration chaos**,
- MCP provides a universal standard for connecting AI agents to external tools 
- (e.g., Slack, GitHub, internal databases)

The Mismatch: 
- Standard MCP uses **JSON-RPC over HTTP/SSE**. 👈
- While clean and human-readable, 
- this conflicts with established enterprise backends
- like those at Spotify, Netflix, and Google—which are built entirely on gRPC.
- gRPC (a **high-performance**, **binary-based** RPC framework using Protocol Buffers) 

## Pain Points for Enterprises
Duplicate Protocol Stacks: 
- Companies are forced to maintain two separate interfaces
  - gRPC for internal microservices 
  - and JSON-RPC for AI agents

Performance Overhead: 
- JSON is text-based and serializes slowly, 
- compared to the compact, binary nature of Protobufs. 
- This adds up significantly in high-frequency agentic workflows

Lack of Type Safety: 
- JSON-RPC lacks strict schema validation, 
- unlike gRPC, which utilizes typed contracts defined by Protocol Buffers

The Translation Tax:
- Organizations faced the choice of rewriting services, 
- or maintaining dual stacks
- none of which are ideal

## Google's Solution: `gRPC Transport` for MCP
![img.png](../../../99_img/2026/02-aws/02/img_4.png)

- Google is contributing a gRPC transport layer to the MCP SDK. 
- It keeps the core MCP logic (tools, resources, prompts) intact 
- but replaces the transport layer.

Moving to HTTP/2 (via gRPC) allows for native bidirectional streaming, eliminating the need for the SSE (Server-Sent Events) workarounds used in standard MCP