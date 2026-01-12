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
  // Preserve progressToken if the client requested progress notifications
  const progressToken = request.params && (request.params as any)._meta && (request.params as any)._meta.progressToken;

  // Create reporters by default. reportMessage will always send notifications/message (clients may ignore them).
  // reportProgress will only send notifications/progress if a progressToken was provided by the client; otherwise it's a no-op.
  const reporters = {
    reportMessage: async (text: string) => {
      const params = progressToken !== undefined ? { message: text, _meta: { progressToken } } : { message: text };
      await server.notification({ method: 'notifications/message', params });
    },
    reportProgress: progressToken !== undefined
      ? async ({ progress, total }: { progress: number; total?: number }) => {
          await server.notification({ method: 'notifications/progress', params: { progress, total, progressToken } });
        }
      : async () => {
          /* no-op when progressToken absent */
        },
  };

  const result = await callTool.handle(request as any, reporters);
  return {
    content: result.content as any,
    isError: result.isError,
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ollama Consult MCP server running on stdio');
}

main().catch(console.error);
