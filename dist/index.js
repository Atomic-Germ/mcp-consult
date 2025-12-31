"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const handlers_js_1 = require("./handlers.js");
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const server = new index_js_1.Server({
    name: 'ollama-consult',
    version: '1.0.0',
});
// Expose tools via MCP request handlers
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => (0, handlers_js_1.listTools)());
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => (0, handlers_js_1.callToolHandler)(request.params));
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('Ollama Consult MCP server running on stdio');
}
main().catch(console.error);
