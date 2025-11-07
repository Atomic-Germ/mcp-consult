import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { listTools, callToolHandler } from "./handlers.js";
import { registerMcpTools } from "./mcpToolRegistrar";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const server = new Server({
  name: "ollama-consult",
  version: "1.0.0",
});

// Expose tools via MCP request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => listTools());

server.setRequestHandler(CallToolRequestSchema, async (request) => callToolHandler(request.params));

async function main() {
  // Register MCP tools into the runtime tool registry (no health check)
  try {
    await registerMcpTools(false);
    console.error("Registered MCP tools at startup");
  } catch (e) {
    console.error("Failed to register MCP tools at startup:", e);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ollama Consult MCP server running on stdio");
}

main().catch(console.error);