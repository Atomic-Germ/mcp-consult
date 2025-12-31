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

1. Install the server:

   ```bash
   npm i -g https://github.com/Atomic-Germ/mcp-consult/releases/download/v1.0.1/mcp-ollama-consult-1.0.1.tgz
   ```

2. Configure the server:

   ```json
   {
	"servers": {
		"ollama-consult": {
			"type": "stdio",
			"command": "mcp-ollama-consult",
			"args": []
		}
	},
	"inputs": []
   }
   ```

## Usage

Make sure Ollama is running locally (default: ([http://localhost:11434](http://localhost:11434)).

Start the MCP server:

```bash
mcp-ollama-consult
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
