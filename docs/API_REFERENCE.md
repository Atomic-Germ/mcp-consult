# MCP Ollama Consult - API Reference

Complete API documentation for all tools and interfaces.

## Table of Contents

- [Core Tools](#core-tools)
  - [consult_ollama](#consult_ollama)
  - [list_ollama_models](#list_ollama_models) 
  - [compare_ollama_models](#compare_ollama_models)
  - [remember_consult](#remember_consult)
  - [sequential_consultation_chain](#sequential_consultation_chain)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Configuration](#configuration)

## Core Tools

### consult_ollama

Consult with a specific Ollama model for reasoning and analysis.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | ✅ | The consultation prompt to send to the model |
| `model` | string | ✅ | Ollama model name (e.g., "llama3.2", "qwen2.5-coder:7b") |
| `context` | string | ❌ | Additional context to provide with the prompt |
| `systemPrompt` | string | ❌ | System prompt to set model behavior |
| `timeoutMs` | number | ❌ | Timeout in milliseconds (default: 120000) |

#### Example Request

```typescript
{
  tool: "consult_ollama",
  arguments: {
    prompt: "Explain the benefits of microservices architecture",
    model: "llama3.2",
    context: "We're designing a new e-commerce platform with expected high traffic",
    systemPrompt: "You are an expert software architect with 15+ years of experience",
    timeoutMs: 180000
  }
}
```

#### Example Response

```typescript
{
  status: "success",
  data: {
    response: "Microservices architecture offers several key benefits for e-commerce platforms...",
    model: "llama3.2",
    timestamp: "2025-11-17T10:30:00Z",
    processingTime: 2847
  },
  metadata: {
    tool: "consult_ollama",
    requestId: "req_1234567890"
  }
}
```

---

### list_ollama_models

List all available Ollama models on the configured instance.

#### Parameters

None.

#### Example Request

```typescript
{
  tool: "list_ollama_models",
  arguments: {}
}
```

#### Example Response

```typescript
{
  status: "success", 
  data: {
    models: [
      {
        name: "llama3.2",
        size: "3.2B",
        modified_at: "2024-11-15T08:22:33Z",
        digest: "sha256:abcd1234...",
        details: {
          parameter_size: "3.2B",
          quantization_level: "Q4_0"
        }
      },
      {
        name: "qwen2.5-coder:7b", 
        size: "7B",
        modified_at: "2024-11-14T15:45:12Z",
        digest: "sha256:efgh5678...",
        details: {
          parameter_size: "7B", 
          quantization_level: "Q4_0"
        }
      }
    ],
    count: 2,
    ollama_version: "0.1.17"
  },
  metadata: {
    tool: "list_ollama_models",
    endpoint: "http://localhost:11434"
  }
}
```

---

### compare_ollama_models

Run the same prompt against multiple models for comparison.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | ✅ | The prompt to send to all models |
| `models` | string[] | ✅ | Array of model names to compare |
| `context` | string | ❌ | Shared context for all models |
| `systemPrompt` | string | ❌ | System prompt for all models |
| `timeoutMs` | number | ❌ | Timeout per model (default: 120000) |

#### Example Request

```typescript
{
  tool: "compare_ollama_models",
  arguments: {
    prompt: "What are the trade-offs between NoSQL and SQL databases?",
    models: ["llama3.2", "qwen2.5-coder:7b", "deepseek-v3.1"],
    context: "Building a real-time analytics dashboard",
    timeoutMs: 90000
  }
}
```

#### Example Response

```typescript
{
  status: "success",
  data: {
    prompt: "What are the trade-offs between NoSQL and SQL databases?",
    results: [
      {
        model: "llama3.2",
        response: "SQL databases provide ACID compliance and strong consistency...",
        processingTime: 2134,
        success: true
      },
      {
        model: "qwen2.5-coder:7b", 
        response: "NoSQL databases excel at horizontal scaling and flexible schemas...",
        processingTime: 1876,
        success: true
      },
      {
        model: "deepseek-v3.1",
        response: "The choice between SQL and NoSQL depends on your specific use case...",
        processingTime: 3421,
        success: true
      }
    ],
    summary: {
      successful: 3,
      failed: 0,
      totalTime: 7431,
      averageTime: 2477
    }
  },
  metadata: {
    tool: "compare_ollama_models",
    comparisonId: "cmp_9876543210"
  }
}
```

---

### remember_consult

Store consultation results in persistent memory for future reference.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | ✅ | Unique identifier for the memory entry |
| `value` | string | ✅ | Content to store (consultation result, analysis, etc.) |
| `metadata` | object | ❌ | Additional metadata about the stored content |
| `tags` | string[] | ❌ | Tags for categorizing and searching |

#### Example Request

```typescript
{
  tool: "remember_consult",
  arguments: {
    key: "microservices_analysis_2024",
    value: "Comprehensive analysis of microservices architecture for e-commerce platform...",
    metadata: {
      model: "llama3.2",
      topic: "architecture",
      project: "ecommerce-platform",
      date: "2024-11-17"
    },
    tags: ["architecture", "microservices", "ecommerce"]
  }
}
```

#### Example Response

```typescript
{
  status: "success",
  data: {
    key: "microservices_analysis_2024",
    stored: true,
    size: 2847,
    backend: "file-storage",
    location: "/tmp/mcp-consult-memory/microservices_analysis_2024.json"
  },
  metadata: {
    tool: "remember_consult",
    timestamp: "2025-11-17T10:35:22Z"
  }
}
```

---

### sequential_consultation_chain

Execute multi-step reasoning chains where consultants build on previous responses.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `consultants` | Consultant[] | ✅ | Array of consultant configurations |

#### Consultant Object

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ | Unique consultant identifier |
| `model` | string | ✅ | Ollama model name |
| `prompt` | string | ✅ | Consultation prompt (can reference previous consultants) |
| `timeoutMs` | number | ❌ | Timeout for this consultant (default: 120000) |
| `systemPrompt` | string | ❌ | System prompt for this consultant |

#### Variable Substitution

Use `{consultant_id}` in prompts to reference previous consultant responses.

#### Example Request

```typescript
{
  tool: "sequential_consultation_chain",
  arguments: {
    consultants: [
      {
        id: "analyst",
        model: "llama3.2",
        prompt: "Analyze the security implications of this API design: GET /users/{id}/sensitive-data",
        timeoutMs: 120000
      },
      {
        id: "architect",
        model: "qwen2.5-coder:7b", 
        prompt: "Based on the analysis from {analyst}, suggest specific architectural improvements and security measures",
        timeoutMs: 180000
      },
      {
        id: "implementer",
        model: "deepseek-v3.1",
        prompt: "Using the recommendations from {architect}, provide concrete code examples and implementation steps",
        timeoutMs: 240000
      }
    ]
  }
}
```

#### Example Response

```typescript
{
  status: "success",
  data: {
    chainId: "chain_abc123def456",
    consultants: [
      {
        id: "analyst",
        model: "llama3.2",
        response: "The API endpoint /users/{id}/sensitive-data presents several security concerns...",
        processingTime: 3421,
        success: true,
        order: 1
      },
      {
        id: "architect", 
        model: "qwen2.5-coder:7b",
        response: "Building on the analyst's findings, I recommend implementing OAuth 2.0 with PKCE...",
        processingTime: 4567,
        success: true,
        order: 2,
        referencedConsultants: ["analyst"]
      },
      {
        id: "implementer",
        model: "deepseek-v3.1", 
        response: "Here's how to implement the architect's recommendations in practice...",
        processingTime: 5234,
        success: true,
        order: 3,
        referencedConsultants: ["architect"]
      }
    ],
    summary: {
      totalConsultants: 3,
      successful: 3,
      failed: 0,
      totalTime: 13222,
      averageTime: 4407
    }
  },
  metadata: {
    tool: "sequential_consultation_chain",
    startTime: "2025-11-17T10:40:00Z",
    endTime: "2025-11-17T10:40:13Z"
  }
}
```

## Response Format

All tools return responses in this standardized format:

```typescript
interface ToolResponse {
  status: 'success' | 'error';
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    tool: string;
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}
```

## Error Handling

### Error Response Format

```typescript
{
  status: "error",
  error: {
    code: "OLLAMA_CONNECTION_FAILED",
    message: "Unable to connect to Ollama server at http://localhost:11434",
    details: {
      endpoint: "http://localhost:11434",
      errno: "ECONNREFUSED", 
      attempt: 1,
      retryAfter: 5000
    }
  },
  metadata: {
    tool: "consult_ollama",
    timestamp: "2025-11-17T10:45:30Z"
  }
}
```

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `OLLAMA_CONNECTION_FAILED` | Cannot connect to Ollama server | Ensure Ollama is running and accessible |
| `MODEL_NOT_FOUND` | Requested model not available | Check available models with `list_ollama_models` |
| `INVALID_PROMPT` | Prompt is empty or invalid | Provide a non-empty prompt string |
| `TIMEOUT_EXCEEDED` | Request timed out | Increase `timeoutMs` or simplify prompt |
| `MEMORY_BACKEND_ERROR` | Memory storage failed | Check memory backend configuration |
| `CHAIN_EXECUTION_FAILED` | Sequential chain failed | Check individual consultant configurations |
| `VALIDATION_ERROR` | Invalid parameters provided | Review parameter requirements and types |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server endpoint |
| `MEMORY_DIR` | `/tmp/mcp-consult-memory` | Local memory storage directory |
| `REMEMBER_MCP_CONFIG` | None | JSON config for memory MCP server |
| `MEMORY_MCP_CMD` | None | Memory MCP server command |
| `MEMORY_MCP_ARGS` | None | Memory MCP server arguments |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `MAX_CONCURRENT_REQUESTS` | `5` | Maximum concurrent Ollama requests |
| `DEFAULT_TIMEOUT_MS` | `120000` | Default timeout for consultations |

### Memory Backend Configuration

The memory system supports multiple backends with automatic fallback:

1. **External MCP Server** (via `REMEMBER_MCP_CONFIG`)
2. **VS Code Integration** (auto-detected from `mcp.json`)
3. **Environment Commands** (via `MEMORY_MCP_CMD`/`MEMORY_MCP_ARGS`)
4. **Local File Storage** (fallback to `MEMORY_DIR`)

#### Example External Memory Configuration

```bash
export REMEMBER_MCP_CONFIG='{"type":"stdio","command":"node","args":["/path/to/memory-server.js"]}'
```

#### VS Code Integration

Place in your VS Code `mcp.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/memory-server.js"],
      "env": {
        "MEMORY_STORE": "/path/to/persistent/storage"
      }
    }
  }
}
```

## Rate Limiting

Default rate limits to prevent Ollama overload:

- **Single Consultations**: No limit
- **Model Comparisons**: Max 10 models per request
- **Sequential Chains**: Max 20 consultants per chain
- **Concurrent Requests**: Max 5 simultaneous requests

Override with environment variables:

```bash
export MAX_COMPARISON_MODELS=15
export MAX_CHAIN_CONSULTANTS=30
export MAX_CONCURRENT_REQUESTS=8
```

## Timeouts

### Default Timeouts

- **consult_ollama**: 120 seconds
- **compare_ollama_models**: 120 seconds per model
- **sequential_consultation_chain**: 120 seconds per consultant

### Recommended Timeout Guidelines

| Task Type | Recommended Timeout |
|-----------|-------------------|
| Simple questions | 60-90 seconds |
| Code analysis | 120-180 seconds |
| Complex reasoning | 180-300 seconds |
| Large context processing | 300-600 seconds |
| Code generation | 240-480 seconds |

### Timeout Best Practices

- Start with default timeouts
- Increase gradually if needed
- Monitor actual processing times
- Use shorter timeouts for quick iterations
- Set longer timeouts for complex analysis

## Integration Examples

### With mcp-optimist

```typescript
// Use consultation to guide code optimization
const optimization = await consultOllama({
  model: "qwen2.5-coder:7b",
  prompt: "Analyze this code for performance optimizations: " + codeSnippet,
  context: "High-traffic web application"
});

// Store the analysis for future reference
await rememberConsult({
  key: "performance_analysis_" + fileHash,
  value: optimization.response,
  metadata: { model: "qwen2.5-coder:7b", type: "performance" }
});
```

### With mcp-tdd

```typescript
// Chain consultation for TDD guidance
await sequentialConsultationChain({
  consultants: [
    {
      id: "test_strategist",
      model: "llama3.2",
      prompt: "Design test strategy for user authentication feature"
    },
    {
      id: "implementer", 
      model: "qwen2.5-coder:7b",
      prompt: "Based on {test_strategist}, write specific test cases"
    }
  ]
});
```