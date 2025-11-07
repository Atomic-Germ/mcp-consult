# MCP Ollama Consult Server

An MCP (Model Context Protocol) server that allows consulting with Ollama models for reasoning from alternative viewpoints.

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
