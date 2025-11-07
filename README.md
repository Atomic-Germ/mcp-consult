# MCP Ollama Consult Server

An MCP (Model Context Protocol) server that allows consulting with Ollama models for reasoning from alternative viewpoints.

## Features

- **consult_ollama**: Send prompts to Ollama models and get responses
- **list_ollama_models**: List available models on the local Ollama instance

## Installation

1. Ensure you have Node.js installed
2. Install dependencies and build:

```bash
npm i
npm run build
```

## Usage

Make sure Ollama is running locally (default: [http://localhost:11434](http://localhost:11434)).

Start the MCP server:

```bash
npm start
```

Or for development:

```bash
npm run dev
```

## Configuration

Set the `OLLAMA_BASE_URL` environment variable to change the Ollama endpoint:

```bash
OLLAMA_BASE_URL=http://your-ollama-server:11434 npm start
```

## Memory (remember_consult) configuration

The server implements a `remember_consult` tool that will try, in order:

1. REMEMBER_MCP_CONFIG environment variable (JSON config or simple command string)
2. VS Code `mcp.json` entries (looks for a server key containing `remember` then `memory`)
3. MEMORY_MCP_CMD / MEMORY_MCP_ARGS environment variables
4. Falls back to a local file store at `MEMORY_DIR` or `/tmp/mcp-consult-memory`

Examples:

Use a simple stdio command via env (no shell quoting here):

```bash
REMEMBER_MCP_CONFIG='{"type":"stdio","command":"/usr/bin/node","args":["/path/to/memory-server.js"]}' npm start
```

Or point to a memory server described in your VS Code `mcp.json` (the server keys `remember`/`memory` are automatically detected).

If no memory MCP is available, the tool will write JSON observations to `MEMORY_DIR` (default `/tmp/mcp-consult-memory`).

## Demo client

There is a simple demo client that spawns the server over stdio and exercises the tools (list, consult, compare, remember):

```bash
npm run build
npm run demo
```

## Tests & CI

Unit tests (Vitest) and a GitHub Actions workflow were added. Run tests locally with:

```bash
npm install
npm test
```

## Docker

To run with Docker, build the image:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

## Requirements

- Node.js 18+
- Ollama running locally or accessible via HTTP
