---
name: mcp-server-patterns
description: Build MCP servers with Node/TypeScript SDK -- tools, resources, prompts, Zod validation, stdio vs Streamable HTTP.
origin: ECC
---

# MCP Server Patterns

The Model Context Protocol (MCP) lets AI assistants call tools, read resources, and use prompts from your server.

## When to Use

- Implementing a new MCP server
- Adding tools or resources to an existing server
- Choosing stdio vs HTTP transport
- Debugging MCP registration and transport issues

## Core Concepts

- **Tools**: Actions the model can invoke (e.g. search, run a command)
- **Resources**: Read-only data the model can fetch (e.g. file contents, API responses)
- **Prompts**: Reusable, parameterized prompt templates
- **Transport**: stdio for local clients; Streamable HTTP for remote

## Setup

```bash
npm install @modelcontextprotocol/sdk zod
```

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({ name: "my-server", version: "1.0.0" });
```

Register tools and resources using the API your SDK version provides. The SDK API evolves -- check the official MCP documentation or Context7 for current method signatures.

Use Zod (or the SDK's preferred schema format) for input validation.

## Transport

- **stdio**: For local clients (e.g. Claude Desktop). Keep server logic independent of transport.
- **Streamable HTTP**: For remote clients (Cursor, cloud). Support legacy HTTP/SSE only when backward compatibility is required.

## Best Practices

- **Schema first**: Define input schemas for every tool; document parameters and return shape
- **Errors**: Return structured errors the model can interpret; avoid raw stack traces
- **Idempotency**: Prefer idempotent tools where possible so retries are safe
- **Rate and cost**: For tools that call external APIs, consider rate limits and cost
- **Versioning**: Pin SDK version in package.json; check release notes when upgrading

## Official SDKs

- **JavaScript/TypeScript**: `@modelcontextprotocol/sdk` (npm)
- **Go**: `modelcontextprotocol/go-sdk` (GitHub)
- **C#**: Official C# SDK for .NET
