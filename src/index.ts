import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ConfigManager } from './config/ConfigManager.js';
import { OllamaService } from './services/OllamaService.js';
import { listToolsHandler } from './handlers/listToolsHandler.js';
import { callToolHandler } from './handlers/callToolHandler.js';

const config = new ConfigManager();
const ollamaService = new OllamaService(config);
const sessionContext = new Map<string, any>();

const server = new Server({
  name: 'mcp-ollama-consult',
  version: '2.0.0',
});

// Expose tools via MCP request handlers using new refactored handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const handler = listToolsHandler();
  return await handler.handle();
});

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const handler = callToolHandler(ollamaService, sessionContext);
  return await handler.handle(request) as CallToolResult;
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ollama Consult MCP server running on stdio');
}

main().catch(console.error);
