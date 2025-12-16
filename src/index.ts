import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { listTools, callToolHandler } from "./handlers.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const server = new Server({
  name: "ollama-consult",
  version: "1.0.0",
});

// Handle initialize request
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  return {
    protocolVersion: request.params.protocolVersion,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "ollama-consult",
      version: "1.0.0",
    },
  };
});

// Expose tools via MCP request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log('Received tools/list request');
  return listTools();
});

server.setRequestHandler(CallToolRequestSchema, async (request) => callToolHandler(request.params));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ollama Consult MCP server running on stdio");
}

main().catch(console.error);