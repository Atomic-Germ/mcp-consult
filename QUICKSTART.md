# MCP Ollama Consult - Quick Start Guide

Get up and running with MCP Ollama Consult in under 5 minutes!

## Prerequisites

- Node.js 18+
- Ollama installed and running locally
- An MCP-compatible client (e.g., Claude Desktop)

## 1. Installation

```bash
# Clone and setup
git clone https://github.com/Atomic-Germ/mcp-consult.git
cd mcp-consult
npm install
npm run build
```

## 2. Verify Ollama

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Should return list of available models
# If not running: ollama serve
```

## 3. Configure MCP Client

### Claude Desktop

Edit your configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

Add the server:

```json
{
  "mcpServers": {
    "consult": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-consult/dist/index.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434"
      }
    }
  }
}
```

### Other MCP Clients

Use these connection details:

- **Command**: `node`
- **Args**: `["/path/to/mcp-consult/dist/index.js"]`
- **Protocol**: stdio

## 4. Test the Setup

### Option A: Demo Client

```bash
npm run demo
```

### Option B: Claude Desktop

1. Restart Claude Desktop
2. Look for "consult" in the MCP tools sidebar
3. Try asking: "List available Ollama models"

## 5. First Consultation

Try these example prompts in Claude:

### Basic Consultation

```
Use the consult_ollama tool to ask llama3.2:
"What are the benefits of microservices architecture?"
```

### Model Comparison

```
Use compare_ollama_models to ask these models the same question:
"Explain dependency injection in simple terms"
Models: ["llama3.2", "qwen2.5-coder:7b"]
```

### Sequential Chain

```
Use sequential_consultation_chain with these consultants:
1. analyst (llama3.2): "Analyze the pros and cons of TypeScript"
2. architect (qwen2.5-coder:7b): "Based on the analysis from {analyst}, recommend best practices for a new TypeScript project"
```

## 6. Verify Everything Works

✅ **Models Listed**: You can see available Ollama models  
✅ **Basic Consultation**: Single model responses work  
✅ **Comparison**: Multiple models respond to same prompt  
✅ **Chains**: Sequential consultations with references  
✅ **Memory**: Consultation results can be stored/retrieved

## Common Issues

### "Connection refused" errors

- Ensure Ollama is running: `ollama serve`
- Check the base URL: `OLLAMA_BASE_URL=http://localhost:11434`

### "No models available"

- Pull a model: `ollama pull llama3.2`
- Verify: `ollama list`

### MCP client can't find tools

- Check the absolute path in configuration
- Restart your MCP client after config changes
- Verify build succeeded: `ls -la dist/`

## Next Steps

- 📖 **Full Documentation**: See [README.md](./README.md)
- 🔗 **Sequential Chains**: Check [sequential_chain_demos.md](./sequential_chain_demos.md)
- 🏗️ **Architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🤝 **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Advanced Configuration

### Memory Setup

For persistent memory across sessions:

```bash
# Use file storage
export MEMORY_DIR="/path/to/memory"

# Or connect to memory MCP server
export REMEMBER_MCP_CONFIG='{"type":"stdio","command":"node","args":["memory-server.js"]}'
```

### Custom Ollama Endpoint

```bash
# Remote Ollama instance
export OLLAMA_BASE_URL="http://your-server:11434"
```

### Timeout Configuration

For complex reasoning tasks, increase timeouts in chain consultants:

```json
{
  "consultants": [
    {
      "id": "deep-thinker",
      "model": "llama3.2",
      "prompt": "Analyze this complex problem...",
      "timeoutMs": 300000
    }
  ]
}
```

---

**🎉 You're ready to start consulting with Ollama models via MCP!**

Need help? Check the [troubleshooting guide](./docs/TROUBLESHOOTING.md) or [open an issue](https://github.com/Atomic-Germ/mcp-consult/issues).
