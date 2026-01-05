#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ConfigManager } from './config/ConfigManager.js';
import { OllamaService } from './services/OllamaService.js';
import { callToolHandler } from './handlers/callToolHandler.js';
import { listToolsHandler } from './handlers/listToolsHandler.js';

const server = new Server({
  name: 'ollama-consult',
  version: '1.1.0',
});

// Initialize services
const config = new ConfigManager();
const ollamaService = new OllamaService(config);
const sessionContext = new Map<string, unknown>();

// Initialize handlers
const listTools = listToolsHandler();
const callTool = callToolHandler(ollamaService, sessionContext);

// Expose tools via MCP request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return await listTools.handle();
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // The CallToolHandler expects { params: { name, arguments } }
  // The request object from SDK matches this structure
  const result = await callTool.handle(request as any);
  return {
    content: result.content as any,
    isError: result.isError
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ollama Consult MCP server running on stdio');
}

main().catch(console.error);
