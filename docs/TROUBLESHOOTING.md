# MCP Ollama Consult - Troubleshooting Guide

Common issues, solutions, and debugging techniques for MCP Ollama Consult.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Model Problems](#model-problems)
- [Performance Issues](#performance-issues)
- [Memory Backend Issues](#memory-backend-issues)
- [Chain Execution Problems](#chain-execution-problems)
- [Configuration Issues](#configuration-issues)
- [Development Issues](#development-issues)
- [Error Reference](#error-reference)

## Connection Issues

### Ollama Server Not Reachable

**Symptoms:**
- "Connection refused" errors
- "ECONNREFUSED" in error details
- Tools return connection errors

**Solutions:**

1. **Check if Ollama is running:**
   ```bash
   # Check if Ollama service is running
   ps aux | grep ollama
   
   # Or try to access the API directly
   curl http://localhost:11434/api/tags
   ```

2. **Start Ollama if not running:**
   ```bash
   # Start Ollama server
   ollama serve
   
   # Or run in background
   nohup ollama serve > ollama.log 2>&1 &
   ```

3. **Check correct endpoint:**
   ```bash
   # Verify your endpoint configuration
   echo $OLLAMA_BASE_URL
   
   # Test different endpoint
   curl http://your-server:11434/api/tags
   ```

4. **Firewall/Network issues:**
   ```bash
   # Check if port 11434 is open
   netstat -an | grep 11434
   
   # Test connectivity
   telnet localhost 11434
   ```

**Configuration Fix:**
```bash
# Set correct Ollama endpoint
export OLLAMA_BASE_URL="http://your-ollama-server:11434"

# For Docker setups
export OLLAMA_BASE_URL="http://host.docker.internal:11434"
```

### MCP Client Connection Issues

**Symptoms:**
- MCP client can't find tools
- Server doesn't start
- "Command not found" errors

**Solutions:**

1. **Verify build output:**
   ```bash
   # Check if build succeeded
   npm run build
   ls -la dist/index.js
   
   # Test server manually
   node dist/index.js
   ```

2. **Check MCP client configuration:**
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

3. **Verify Node.js path:**
   ```bash
   # Check Node.js installation
   which node
   node --version
   
   # Use full path if needed
   /usr/local/bin/node dist/index.js
   ```

## Model Problems

### Model Not Found

**Symptoms:**
- "Model not available" errors
- Empty model list
- Specific model returns 404

**Solutions:**

1. **List available models:**
   ```bash
   # Check via Ollama CLI
   ollama list
   
   # Check via API
   curl http://localhost:11434/api/tags
   ```

2. **Pull required models:**
   ```bash
   # Pull commonly used models
   ollama pull llama3.2
   ollama pull qwen2.5-coder:7b
   ollama pull deepseek-v3.1
   ```

3. **Verify model names:**
   ```typescript
   // Check available models first
   {
     tool: "list_ollama_models",
     arguments: {}
   }
   
   // Then use exact model name
   {
     tool: "consult_ollama",
     arguments: {
       model: "llama3.2:latest",  // Use full name
       prompt: "Test question"
     }
   }
   ```

### Model Performance Issues

**Symptoms:**
- Very slow responses
- Inconsistent output quality
- Memory errors

**Solutions:**

1. **Check model size vs available RAM:**
   ```bash
   # Check system memory
   free -h
   
   # Check Ollama memory usage
   top -p $(pgrep ollama)
   ```

2. **Use smaller models:**
   ```bash
   # Pull quantized versions
   ollama pull llama3.2:7b-instruct-q4_0
   ollama pull qwen2.5-coder:1.5b
   ```

3. **Optimize model settings:**
   ```bash
   # Set memory limit
   export OLLAMA_MAX_LOADED_MODELS=2
   export OLLAMA_MAX_VRAM=4GB
   ```

## Performance Issues

### Slow Response Times

**Symptoms:**
- Responses take > 2 minutes
- Timeouts on simple questions
- High CPU usage

**Diagnostics:**

1. **Test direct Ollama performance:**
   ```bash
   # Time a direct Ollama request
   time curl -X POST http://localhost:11434/api/generate \
     -H "Content-Type: application/json" \
     -d '{
       "model": "llama3.2",
       "prompt": "Hello world",
       "stream": false
     }'
   ```

2. **Monitor system resources:**
   ```bash
   # Check CPU and memory
   htop
   
   # Check disk I/O
   iostat -x 1
   ```

**Solutions:**

1. **Optimize timeouts:**
   ```typescript
   {
     tool: "consult_ollama",
     arguments: {
       prompt: "Complex analysis...",
       model: "llama3.2",
       timeoutMs: 300000  // 5 minutes for complex tasks
     }
   }
   ```

2. **Use faster models for simple tasks:**
   ```typescript
   // Use smaller model for quick questions
   {
     tool: "consult_ollama", 
     arguments: {
       prompt: "What is REST?",
       model: "llama3.2:1b"  // Faster for simple questions
     }
   }
   ```

3. **Optimize prompts:**
   ```typescript
   // ❌ Bad: Very long, complex prompt
   {
     prompt: "Analyze this entire 500-line file and provide detailed recommendations..."
   }
   
   // ✅ Good: Focused, specific prompt
   {
     prompt: "Review this function for security issues: [specific function]",
     context: "Focus on input validation and SQL injection"
   }
   ```

### Memory Leaks

**Symptoms:**
- Gradually increasing memory usage
- Server crashes after extended use
- "Out of memory" errors

**Solutions:**

1. **Monitor memory usage:**
   ```bash
   # Watch memory over time
   watch -n 1 'ps aux | grep node'
   
   # Check for memory leaks
   node --inspect dist/index.js
   ```

2. **Restart server periodically:**
   ```bash
   # Add restart script
   #!/bin/bash
   while true; do
     node dist/index.js
     echo "Server crashed, restarting..."
     sleep 5
   done
   ```

3. **Limit concurrent requests:**
   ```bash
   export MAX_CONCURRENT_REQUESTS=3
   ```

## Memory Backend Issues

### Memory Storage Failures

**Symptoms:**
- "Memory backend error" messages
- Unable to store consultation results
- File permission errors

**Solutions:**

1. **Check memory directory permissions:**
   ```bash
   # Check directory exists and is writable
   ls -la /tmp/mcp-consult-memory/
   
   # Create if missing
   mkdir -p /tmp/mcp-consult-memory
   chmod 755 /tmp/mcp-consult-memory
   ```

2. **Test memory backend directly:**
   ```bash
   # Set custom memory directory
   export MEMORY_DIR="/path/to/writable/directory"
   
   # Test write permissions
   touch $MEMORY_DIR/test.txt
   rm $MEMORY_DIR/test.txt
   ```

3. **Configure alternative backend:**
   ```bash
   # Use different memory server
   export REMEMBER_MCP_CONFIG='{"type":"stdio","command":"node","args":["memory-server.js"]}'
   ```

### Memory MCP Server Issues

**Symptoms:**
- Memory server connection fails
- "Memory server not found" errors
- Inconsistent memory operations

**Solutions:**

1. **Verify memory server setup:**
   ```bash
   # Test memory server directly
   node memory-server.js
   
   # Check if server responds
   echo '{"method":"ping"}' | node memory-server.js
   ```

2. **Check VS Code integration:**
   ```json
   // Verify mcp.json format
   {
     "mcpServers": {
       "memory": {
         "command": "node",
         "args": ["memory-server.js"]
       }
     }
   }
   ```

3. **Fallback to file storage:**
   ```bash
   # Disable memory MCP server temporarily
   unset REMEMBER_MCP_CONFIG
   export MEMORY_DIR="/tmp/mcp-consult-memory"
   ```

## Chain Execution Problems

### Sequential Chain Failures

**Symptoms:**
- Chain stops at specific consultant
- Variable substitution not working
- Partial results returned

**Solutions:**

1. **Test consultants individually:**
   ```typescript
   // Test each consultant separately first
   {
     tool: "consult_ollama",
     arguments: {
       prompt: "Same prompt as in chain",
       model: "llama3.2"
     }
   }
   ```

2. **Check variable references:**
   ```typescript
   // ❌ Wrong: Invalid consultant reference
   {
     consultants: [
       {
         id: "analyzer",
         prompt: "Analyze code..."
       },
       {
         id: "fixer",
         prompt: "Fix issues from {analizer}"  // Typo!
       }
     ]
   }
   
   // ✅ Correct: Valid reference
   {
     consultants: [
       {
         id: "analyzer",
         prompt: "Analyze code..."
       },
       {
         id: "fixer", 
         prompt: "Fix issues from {analyzer}"
       }
     ]
   }
   ```

3. **Adjust timeouts:**
   ```typescript
   {
     consultants: [
       {
         id: "quick_analysis",
         model: "llama3.2",
         prompt: "Quick overview...",
         timeoutMs: 60000
       },
       {
         id: "detailed_analysis",
         model: "deepseek-v3.1",
         prompt: "Detailed analysis based on {quick_analysis}",
         timeoutMs: 300000  // Longer timeout for complex analysis
       }
     ]
   }
   ```

### Chain Performance Issues

**Symptoms:**
- Very long chain execution times
- Chains time out frequently
- Resource exhaustion

**Solutions:**

1. **Optimize chain structure:**
   ```typescript
   // ❌ Bad: Too many sequential steps
   {
     consultants: [
       { id: "step1", prompt: "..." },
       { id: "step2", prompt: "Based on {step1}..." },
       { id: "step3", prompt: "Based on {step2}..." },
       // ... 15 more steps
     ]
   }
   
   // ✅ Good: Focused, efficient chain
   {
     consultants: [
       { id: "analyze", prompt: "Analyze the problem" },
       { id: "solve", prompt: "Solve based on {analyze}" },
       { id: "verify", prompt: "Verify {solve}" }
     ]
   }
   ```

2. **Use appropriate models:**
   ```typescript
   {
     consultants: [
       {
         id: "quick_scan",
         model: "llama3.2:1b",  // Fast model for simple tasks
         prompt: "Quick overview of issues"
       },
       {
         id: "deep_analysis", 
         model: "deepseek-v3.1",  // Powerful model for complex analysis
         prompt: "Detailed analysis of {quick_scan} findings"
       }
     ]
   }
   ```

## Configuration Issues

### Environment Variable Problems

**Symptoms:**
- Default settings used instead of custom values
- Configuration not taking effect
- Inconsistent behavior

**Solutions:**

1. **Verify environment variables:**
   ```bash
   # Check current values
   env | grep OLLAMA
   env | grep MEMORY
   
   # Test with explicit values
   OLLAMA_BASE_URL=http://localhost:11434 npm start
   ```

2. **Use configuration file:**
   ```json
   // Create config.json
   {
     "ollama": {
       "baseUrl": "http://localhost:11434",
       "timeout": 120000
     },
     "memory": {
       "directory": "/custom/memory/path",
       "maxSize": "100MB"
     }
   }
   ```

3. **Check precedence:**
   ```bash
   # Environment variables override defaults
   # Command line args override environment
   # Config file overrides everything
   
   OLLAMA_BASE_URL=http://server1:11434 \
   node dist/index.js --ollama-url http://server2:11434
   ```

### MCP Client Configuration

**Symptoms:**
- Tools not appearing in client
- Client can't connect to server
- Invalid configuration errors

**Solutions:**

1. **Validate JSON syntax:**
   ```bash
   # Check JSON is valid
   cat ~/.config/claude/claude_desktop_config.json | jq .
   
   # Common JSON errors: trailing commas, unquoted keys
   ```

2. **Use absolute paths:**
   ```json
   {
     "mcpServers": {
       "consult": {
         "command": "node",
         "args": ["/home/user/mcp-consult/dist/index.js"]
       }
     }
   }
   ```

3. **Test configuration:**
   ```bash
   # Test server starts correctly
   node /home/user/mcp-consult/dist/index.js
   
   # Should show MCP initialization messages
   ```

## Development Issues

### Build Problems

**Symptoms:**
- TypeScript compilation errors
- Missing dependencies
- Build output incomplete

**Solutions:**

1. **Clean build:**
   ```bash
   # Clean and rebuild
   rm -rf dist/ node_modules/
   npm install
   npm run build
   ```

2. **Check TypeScript configuration:**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "outDir": "./dist",
       "strict": true
     }
   }
   ```

3. **Verify dependencies:**
   ```bash
   # Check for peer dependency warnings
   npm ls
   
   # Update dependencies
   npm update
   ```

### Testing Issues

**Symptoms:**
- Tests fail intermittently
- Ollama not available in tests
- Mock setup problems

**Solutions:**

1. **Mock Ollama in tests:**
   ```typescript
   // test/setup.ts
   import nock from 'nock';
   
   beforeEach(() => {
     nock('http://localhost:11434')
       .post('/api/generate')
       .reply(200, { response: 'Mock response' });
   });
   ```

2. **Use test environment:**
   ```bash
   # Set test environment
   export NODE_ENV=test
   export OLLAMA_BASE_URL=http://mock-ollama:11434
   ```

3. **Integration test setup:**
   ```bash
   # Start test Ollama instance
   docker run -d -p 11435:11434 ollama/ollama
   export OLLAMA_BASE_URL=http://localhost:11435
   npm test
   ```

## Error Reference

### Common Error Codes

| Error Code | Description | Common Causes | Solutions |
|------------|-------------|---------------|-----------|
| `OLLAMA_CONNECTION_FAILED` | Cannot connect to Ollama | Server not running, wrong URL | Start Ollama, check endpoint |
| `MODEL_NOT_FOUND` | Model not available | Model not pulled, wrong name | Pull model, check spelling |
| `TIMEOUT_EXCEEDED` | Request timed out | Complex prompt, slow model | Increase timeout, simplify prompt |
| `INVALID_PROMPT` | Empty or invalid prompt | Missing prompt, null value | Provide valid prompt string |
| `MEMORY_BACKEND_ERROR` | Memory storage failed | Permissions, disk space | Check permissions, free space |
| `CHAIN_EXECUTION_FAILED` | Sequential chain failed | Invalid references, timeouts | Check consultant references |
| `VALIDATION_ERROR` | Invalid parameters | Wrong types, missing required | Check parameter types |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Concurrent request limit | Reduce concurrent requests |

### Debugging Steps

1. **Enable debug logging:**
   ```bash
   export LOG_LEVEL=debug
   npm start
   ```

2. **Test individual components:**
   ```bash
   # Test Ollama directly
   curl -X POST http://localhost:11434/api/generate \
     -d '{"model":"llama3.2","prompt":"test"}'
   
   # Test MCP server
   echo '{"method":"tools/list"}' | node dist/index.js
   ```

3. **Check logs:**
   ```bash
   # Application logs
   tail -f logs/app.log
   
   # System logs
   journalctl -u ollama -f
   ```

4. **Network debugging:**
   ```bash
   # Check network connectivity
   ping your-ollama-server
   telnet your-ollama-server 11434
   
   # Monitor network traffic
   tcpdump -i any port 11434
   ```

## Getting Help

If you're still experiencing issues:

1. **Check GitHub Issues:** [mcp-consult issues](https://github.com/Atomic-Germ/mcp-consult/issues)
2. **Create detailed bug report:**
   - Operating system and version
   - Node.js version (`node --version`)
   - Ollama version (`ollama --version`)
   - MCP client type and version
   - Complete error messages
   - Steps to reproduce
   - Configuration files (redacted)

3. **Join discussions:** [GitHub Discussions](https://github.com/Atomic-Germ/mcp-consult/discussions)

## Additional Resources

- [MCP Protocol Documentation](https://modelcontextprotocol.io/docs)
- [Ollama Documentation](https://github.com/ollama/ollama)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [TypeScript Troubleshooting](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)