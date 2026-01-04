#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const ConfigManager_js_1 = require("./config/ConfigManager.js");
const OllamaService_js_1 = require("./services/OllamaService.js");
const callToolHandler_js_1 = require("./handlers/callToolHandler.js");
const listToolsHandler_js_1 = require("./handlers/listToolsHandler.js");
const server = new index_js_1.Server({
    name: 'ollama-consult',
    version: '1.1.0',
});
// Initialize services
const config = new ConfigManager_js_1.ConfigManager();
const ollamaService = new OllamaService_js_1.OllamaService(config);
const sessionContext = new Map();
// Initialize handlers
const listTools = (0, listToolsHandler_js_1.listToolsHandler)();
const callTool = (0, callToolHandler_js_1.callToolHandler)(ollamaService, sessionContext);
// Expose tools via MCP request handlers
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return await listTools.handle();
});
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    // The CallToolHandler expects { params: { name, arguments } }
    // The request object from SDK matches this structure
    const result = await callTool.handle(request);
    return {
        content: result.content,
        isError: result.isError,
    };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('Ollama Consult MCP server running on stdio');
}
main().catch(console.error);
