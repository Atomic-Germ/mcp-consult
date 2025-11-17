import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { ConfigManager } from './config/ConfigManager.js';
import { OllamaService } from './services/OllamaService.js';
import { listToolsHandler } from './handlers/listToolsHandler.js';
import { callToolHandler } from './handlers/callToolHandler.js';

const config = new ConfigManager();
const ollamaService = new OllamaService(config);
const sessionContext = new Map<string, unknown>();

const server = new Server({
  name: 'mcp-ollama-consult',
  version: '2.0.0',
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const handler = listToolsHandler();
  return await handler.handle();
});

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const handler = callToolHandler(ollamaService, sessionContext);
  return (await handler.handle(request as unknown as any)) as CallToolResult;
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
