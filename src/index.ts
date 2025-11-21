import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { ConfigManager } from './config/ConfigManager.js';
import { ProviderManager } from './services/ProviderManager.js';
import { listToolsHandler } from './handlers/listToolsHandler.js';
import { callToolHandler } from './handlers/callToolHandler.js';

const config = new ConfigManager();
const providerManager = new ProviderManager(config);
const sessionContext = new Map<string, unknown>();

const server = new Server({
  name: 'mcp-consult',
  version: '2.0.0',
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const handler = listToolsHandler();
  return await handler.handle();
});

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const handler = callToolHandler(config, sessionContext, providerManager);
  return (await handler.handle(request as unknown as any)) as CallToolResult;
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
