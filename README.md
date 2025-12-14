# MCP Ollama Consult Server
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![CI/CD](https://github.com/Atomic-Germ/mcp-consult/actions/workflows/ci.yml/badge.svg)](https://github.com/Atomic-Germ/mcp-consult/actions/workflows/ci.yml)

An MCP (Model Context Protocol) server that allows consulting with Ollama models for reasoning from alternative viewpoints.

<a href="https://glama.ai/mcp/servers/@Atomic-Germ/mcp-consult">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@Atomic-Germ/mcp-consult/badge" alt="Ollama Consult Server MCP server" />
</a>

## Features

- **consult_ollama**: Send prompts to Ollama models and get responses
- **list_ollama_models**: List available models on the local Ollama instance

## Installation

1. Ensure you have Node.js installed
2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

## Usage

Make sure Ollama is running locally (default: ([http://localhost:11434](http://localhost:11434)).

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

## Extra Tools for Bridge Integration

This project also provides additional tools to help with Bridge workflows and session integration:

- `remember_consult`: Save a consult to a `MEMORY_DIR` for later review
- `list_consults`: List saved consult entries
- `read_consult`: Return the content and metadata of a saved consult
- `critique_consult`: Run one or more models against a saved consult and return the model outputs (useful for generating critiques)
 - `search_consults`: Search saved consults by query, sessionId, model, key, etc.

Note: `remember_consult` accepts an optional `sessionId` parameter which allows you to tie consults to a Bridge session or meditation trace. `search_consults` can be used to find consults by this `sessionId`.

### Quick Bridge Walk Example

1. Run a consult and save it to memory:

```bash
# With your MCP client, call the `consult_ollama` tool, then use `remember_consult` to persist it.
```

2. List consults saved in memory:

```bash
# Call the `search_consults` tool to find consults (e.g., by `sessionId` or query):
# { "sessionId": "session-abc123" } or { "query": "alternative viewpoint" }
```

3. Read a consult to get the saved response and context:

```bash
# Call `read_consult` with a filename returned from `list_consults`.
```

4. Generate critiques for the consult via multiple models:

```bash
# Call `critique_consult` with the target filename and `models` array like ["llama2", "gpt-4o"].
```

This workflow allows `mcp-bridge` to store meditation or consultation traces, then request critiques and context for deeper analysis or prompt-injection into further meditations.

