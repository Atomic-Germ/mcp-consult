# MCP Ollama Consult Architecture

## Overview

MCP Ollama Consult is built using a modular architecture that separates concerns between MCP protocol handling, Ollama integration, memory management, and sequential consultation workflows.

## Project Structure

```
mcp-consult/
├── src/
│   ├── index.ts                    # Entry point & MCP server setup
│   ├── executor.ts                 # Core tool execution engine
│   ├── mcpToolRegistrar.ts         # MCP tool registration and metadata
│   ├── config.ts                   # Configuration management
│   ├── memory.ts                   # Memory storage interface
│   ├── logger.ts                   # Logging utilities
│   ├── services/
│   │   └── OllamaService.ts        # Ollama API integration
│   ├── handlers/                   # Tool request handlers
│   │   ├── BaseHandler.ts          # Base handler interface
│   │   ├── ConsultOllamaHandler.ts # Ollama consultation logic
│   │   ├── callToolHandler.ts      # Tool call dispatch
│   │   └── listToolsHandler.ts     # Tool listing logic
│   ├── types/                      # TypeScript definitions
│   ├── utils/                      # Utility functions
│   ├── config/                     # Configuration schemas
│   ├── flowParser.ts               # Sequential chain parsing
│   ├── condition.ts                # Conditional logic utilities
│   └── conversationTypes.ts        # Conversation data structures
└── test/                           # Test suites
    ├── executor.test.ts            # Core execution tests
    ├── handlers.test.ts            # Handler unit tests
    ├── OllamaService.test.ts       # Service integration tests
    └── flowParser.test.ts          # Chain parsing tests
```

## Core Components

### 1. MCP Server (index.ts)

The main server setup that:

- Initializes the MCP protocol handler
- Registers available tools with the MCP system
- Sets up stdin/stdout communication
- Handles server lifecycle

### 2. Tool Executor (executor.ts)

The central execution engine that:

- Dispatches tool calls to appropriate handlers
- Manages tool execution context and state
- Handles errors and provides consistent responses
- Coordinates between different tool types

### 3. MCP Tool Registrar (mcpToolRegistrar.ts)

Manages tool definitions and metadata:

- Registers all available tools with schemas
- Provides tool discovery for MCP clients
- Maintains tool versioning and compatibility
- Handles dynamic tool registration

### 4. Ollama Service (services/OllamaService.ts)

Handles all Ollama integration:

- HTTP client for Ollama API communication
- Model listing and availability checking
- Prompt execution with timeout handling
- Response parsing and error handling
- Connection pooling and retry logic

**Key Methods:**

- `listModels()` - Get available Ollama models
- `consultModel()` - Send prompt to specific model
- `compareModels()` - Execute same prompt on multiple models
- `healthCheck()` - Verify Ollama connectivity

### 5. Tool Handlers (handlers/)

#### BaseHandler

Abstract base class providing:

- Common validation patterns
- Error handling utilities
- Response formatting
- Logging integration

#### ConsultOllamaHandler

Implements Ollama consultation logic:

- Single model consultation
- Multi-model comparison
- Result formatting and aggregation
- Error recovery and fallbacks

### 6. Sequential Chain Processing (flowParser.ts)

Manages complex multi-step reasoning:

- Parses consultant chain definitions
- Manages inter-consultant dependencies
- Handles variable substitution between steps
- Provides execution flow control

**Key Features:**

- Reference previous consultant results: `{consultant_id}`
- Timeout management per consultant
- Error handling and recovery
- Result aggregation and formatting

### 7. Memory Management (memory.ts)

Flexible memory backend integration:

- Supports multiple memory backends (MCP servers, file system)
- Auto-detection of available memory services
- Fallback to local file storage
- Key-value storage with metadata

**Backend Priority:**

1. `REMEMBER_MCP_CONFIG` environment variable
2. VS Code `mcp.json` auto-detection
3. `MEMORY_MCP_CMD`/`MEMORY_MCP_ARGS` variables
4. Local file fallback (`MEMORY_DIR`)

### 8. Configuration System (config.ts, config/)

Manages all configuration:

- Environment variable handling
- Default value management
- Configuration validation
- Runtime configuration updates

## Data Flow

### Single Consultation

```
MCP Client
    ↓
index.ts (Server Setup)
    ↓
executor.ts (Tool Dispatch)
    ↓
ConsultOllamaHandler
    ↓
OllamaService
    ↓
Ollama API
```

### Sequential Consultation Chain

```
MCP Client (chain definition)
    ↓
flowParser.ts (Parse chain)
    ↓
executor.ts (Execute consultants)
    ↓ ↓ ↓
ConsultOllamaHandler (for each consultant)
    ↓
OllamaService (with variable substitution)
    ↓
Memory (optional storage of results)
```

### Memory Operations

```
remember_consult tool
    ↓
memory.ts (Backend detection)
    ↓
┌─────────────┬──────────────┬──────────────┐
│             │              │              │
MCP Memory   File Storage   VS Code       Environment
Server       Fallback       Config        Variables
```

## Tool Architecture

### Available Tools

| Tool | Handler | Purpose |
|------|---------|---------|
| `consult_ollama` | ConsultOllamaHandler | Single model consultation |
| `list_ollama_models` | ConsultOllamaHandler | Model enumeration |
| `compare_ollama_models` | ConsultOllamaHandler | Multi-model comparison |
| `remember_consult` | Memory system | Persistent storage |
| `sequential_consultation_chain` | flowParser + handlers | Multi-step reasoning |

### Tool Schema Management

Tools are defined with:

- **Input Schema**: Zod validation for parameters
- **Output Schema**: Standardized response format
- **Metadata**: Tool description, examples, version
- **Error Handling**: Consistent error responses

## Design Principles

1. **Modular Architecture**: Clear separation of concerns
2. **Flexible Integration**: Multiple memory backends, configurable endpoints
3. **Error Resilience**: Graceful fallbacks and error recovery
4. **Type Safety**: Comprehensive TypeScript throughout
5. **Extensibility**: Plugin-like tool handler system
6. **Performance**: Connection pooling, timeout management

## Extension Points

### Adding a New Tool

1. Create handler in `handlers/` extending `BaseHandler`
2. Register tool in `mcpToolRegistrar.ts`
3. Add tool case in `executor.ts`
4. Define tool schema with Zod validation
5. Write comprehensive tests

### Adding a New Memory Backend

1. Implement memory interface in `memory.ts`
2. Add backend detection logic
3. Update configuration options
4. Add integration tests

### Adding a New LLM Service

1. Create service class in `services/`
2. Implement common interface (model listing, consultation)
3. Create corresponding handlers
4. Update tool registrations

## Dependencies

### Production

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `axios` - HTTP client for Ollama API
- `zod` - Runtime type validation and schema definition
- `js-yaml` - Configuration file parsing

### Development

- `vitest` - Test framework and coverage
- `typescript` - Type system and compilation
- `eslint` - Code linting and style enforcement
- `prettier` - Code formatting

## Testing Strategy

- **Unit Tests**: Individual handler and service testing
- **Integration Tests**: End-to-end tool execution
- **Service Tests**: Ollama API integration testing
- **Chain Tests**: Sequential consultation workflows
- **Memory Tests**: All memory backend scenarios

**Coverage Targets:**
- Handlers: >90%
- Services: >85%
- Overall: >75%

## Performance Considerations

### Timeout Management

- Default: 120 seconds per consultation
- Configurable per consultant in chains
- Progressive timeout strategies for complex reasoning

### Connection Management

- HTTP connection pooling for Ollama
- Retry logic with exponential backoff
- Connection health monitoring

### Memory Efficiency

- Streaming responses for large outputs
- Lazy loading of memory backends
- Garbage collection of completed chains

## Security

- **No Credential Storage**: Uses environment-based configuration
- **Local Communication**: Ollama communication over localhost by default
- **Sandboxed Execution**: No arbitrary code execution
- **Input Validation**: All inputs validated with Zod schemas
- **Memory Isolation**: Each consultation operates independently

## Configuration

### Environment Variables

```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434

# Memory Configuration  
MEMORY_DIR=/tmp/mcp-consult-memory
REMEMBER_MCP_CONFIG='{"type":"stdio","command":"node","args":["memory-server.js"]}'
MEMORY_MCP_CMD=node
MEMORY_MCP_ARGS=memory-server.js

# Logging
LOG_LEVEL=info
```

### VS Code Integration

Auto-detects memory servers in `mcp.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["memory-server.js"]
    }
  }
}
```

## Error Handling

### Hierarchical Error Recovery

1. **Tool Level**: Individual tool error handling
2. **Service Level**: Ollama connection failures
3. **Chain Level**: Sequential consultation failures
4. **Memory Level**: Storage backend failures

### Error Response Format

```typescript
{
  status: 'error',
  error: {
    code: string,
    message: string,
    details?: any
  },
  metadata: {
    timestamp: string,
    tool: string
  }
}
```