# MCP Ollama Consult Server

> An intelligent MCP server for consulting with Ollama models and enabling multi-perspective AI reasoning

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![CI/CD](https://github.com/Atomic-Germ/mcp-consult/actions/workflows/ci.yml/badge.svg)](https://github.com/Atomic-Germ/mcp-consult/actions/workflows/ci.yml)

## Overview

MCP Ollama Consult is a Model Context Protocol (MCP) server that enables AI agents to consult with multiple Ollama models for diverse perspectives, reasoning chains, and collaborative problem-solving. It provides powerful tools for sequential consultation workflows and persistent memory management.

### Key Features

- 🤝 **Multi-Model Consultation** - Consult with any available Ollama model
- 📊 **Model Comparison** - Run identical prompts against multiple models simultaneously
- 🧠 **Sequential Reasoning Chains** - Execute complex multi-step reasoning workflows
- 💾 **Persistent Memory** - Store and retrieve consultation results across sessions
- 🔗 **Flexible Integration** - Works with any MCP-compatible client or framework
- ⚡ **Timeout Management** - Configurable timeouts for complex reasoning tasks
- 🎯 **Demo Client** - Built-in demo for testing and exploration

## Installation

```bash
# Clone the repository
git clone https://github.com/Atomic-Germ/mcp-consult.git
cd mcp-consult

# Install dependencies
npm install

# Build the project
npm run build
```

## Quick Start

### As an MCP Server

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "consult": {
      "command": "node",
      "args": ["/path/to/mcp-consult/dist/index.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434"
      }
    }
  }
}
```

### Running the Server

Make sure Ollama is running locally (default: [http://localhost:11434](http://localhost:11434)).

```bash
# Start the server
npm start

# Or for development with auto-reload
npm run dev

# Run the demo client
npm run demo
```

## Copilot & Continue

For guidance on using GitHub Copilot and the local Continue runner with this toolkit, see [Copilot & Continue](COPILOT_AND_CONTINUE.md).

## Usage Examples

### Basic Consultation

```typescript
// Request via MCP
{
  "tool": "consult_ollama",
  "arguments": {
    "prompt": "Explain the benefits of microservices architecture",
    "model": "llama3.2",
    "context": "We're designing a new e-commerce platform"
  }
}
```

### Model Comparison

```typescript
{
  "tool": "compare_ollama_models",
  "arguments": {
    "prompt": "What are the trade-offs of NoSQL vs SQL databases?",
    "models": ["llama3.2", "qwen2.5-coder:7b", "deepseek-v3.1"]
  }
}
```

### Sequential Consultation Chain

```typescript
{
  "tool": "sequential_consultation_chain",
  "arguments": {
    "consultants": [
      {
        "id": "analyst",
        "model": "llama3.2",
        "prompt": "Analyze the security implications of this API design: {code}",
        "timeoutMs": 120000
      },
      {
        "id": "architect",
        "model": "qwen2.5-coder:7b",
        "prompt": "Based on the analysis from {analyst}, suggest architectural improvements",
        "timeoutMs": 180000
      }
    ]
  }
}
```

### Environment Variables

```bash
# Ollama server endpoint (default: http://localhost:11434)
OLLAMA_BASE_URL=http://your-ollama-server:11434

# Memory storage directory (default: /tmp/mcp-consult-memory)
MEMORY_DIR=/custom/memory/path

# Memory MCP server configuration
REMEMBER_MCP_CONFIG='{"type":"stdio","command":"node","args":["/path/to/memory-server.js"]}'
```

### Memory Configuration

The `remember_consult` tool supports flexible memory backend configuration. It attempts to connect to memory storage in this order:

1. **REMEMBER_MCP_CONFIG** environment variable (JSON config)
2. **VS Code mcp.json** entries (auto-detects `remember`/`memory` servers)
3. **MEMORY_MCP_CMD/MEMORY_MCP_ARGS** environment variables
4. **Local file fallback** at `MEMORY_DIR` (default: `/tmp/mcp-consult-memory`)

#### Example Memory Server Configuration

```bash
# Use external memory MCP server
REMEMBER_MCP_CONFIG='{"type":"stdio","command":"/usr/bin/node","args":["/path/to/memory-server.js"]}'
```

VS Code `mcp.json` (automatically detected):

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/memory-server.js"]
    }
  }
}
```

## Tool Reference

### consult_ollama

Consult with a specific Ollama model.

**Parameters:**

- `prompt` (required): The consultation prompt
- `model` (required): Ollama model name (e.g., "llama3.2")
- `context` (optional): Additional context for the consultation

### list_ollama_models

List all available models on the Ollama instance.

**Parameters:** None

### compare_ollama_models

Run the same prompt against multiple models for comparison.

**Parameters:**

- `prompt` (required): The prompt to send to all models
- `models` (required): Array of model names to compare
- `context` (optional): Shared context for all models

### remember_consult

Store consultation results in persistent memory.

**Parameters:**

- `key` (required): Unique identifier for the memory entry
- `value` (required): Content to store
- `metadata` (optional): Additional context about the stored data

### sequential_consultation_chain

Execute multi-step reasoning chains where consultants build on previous responses.

**Parameters:**

- `consultants` (required): Array of consultant configurations
  - `id` (required): Unique consultant identifier
  - `model` (required): Ollama model name
  - `prompt` (required): Consultation prompt (can reference previous consultants with `{consultant_id}`)
  - `timeoutMs` (optional): Timeout in milliseconds (default: 120000)

## Development

### Project Structure

```
mcp-consult/
├── src/
│   ├── index.ts              # Main entry point
│   ├── handlers.ts           # Tool request handlers
│   ├── services/
│   │   ├── OllamaService.ts  # Ollama API integration
│   │   └── MemoryService.ts  # Memory management
│   ├── utils/
│   └── types/
├── test/                     # Test suites
├── dist/                     # Compiled output
└── docs/                     # Documentation
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Run demo client
npm run demo
```

### Building

```bash
# Development build
npm run build

# Watch mode
npm run build:watch
```

## Sequential Consultation Chains

The `sequential_consultation_chain` tool enables complex multi-step reasoning by allowing consultants to reference and build upon previous responses. This creates powerful workflows for collaborative problem-solving.

### Timeout Configuration

Configure timeouts based on task complexity:

```json
{
  "consultants": [
    {
      "id": "analyzer",
      "model": "deepseek-v3.1:671b-cloud",
      "prompt": "Analyze this complex codebase...",
      "timeoutMs": 180000
    }
  ]
}
```

**Recommended timeouts:**

- Simple queries: 60-90 seconds
- Code generation: 180-300 seconds
- Complex analysis: 300-600 seconds

**Note**: Avoid breaking complex questions into smaller parts, as this loses conversation context. Instead, increase the `timeoutMs` for consultants that need more processing time.

For detailed examples, see [sequential_chain_demos.md](./sequential_chain_demos.md).

## Integration with Other MCP Tools

MCP Consult works seamlessly with other MCP servers:

- **mcp-optimist** - Code optimization and analysis
- **mcp-tdd** - Test-driven development workflows
- **Memory servers** - Persistent data storage
- **Code analysis tools** - Static analysis integration

## Docker

### Building the Image

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

```bash
# Build and run
docker build -t mcp-consult .
docker run -p 3000:3000 mcp-consult
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Guidelines

- Follow Test-Driven Development (TDD) practices
- Maintain test coverage above 70%
- Use TypeScript strict mode
- Follow existing code style and formatting
- Update documentation for new features

## Architecture

For detailed technical architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Requirements

- Node.js 18+
- Ollama server running locally or accessible via HTTP
- npm or pnpm for package management

## Support

- 📚 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/Atomic-Germ/mcp-consult/issues)
- 💬 [Discussions](https://github.com/Atomic-Germ/mcp-consult/discussions)
- 🔗 [Sequential Chain Demos](./sequential_chain_demos.md)

## Links

- [Model Context Protocol Specification](https://modelcontextprotocol.io/docs)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Ollama](https://ollama.ai/)

---

**Built with ❤️ using the Model Context Protocol and Test-Driven Development**
