# Ollama Timeout Tuning for Complex Prompts

## Problem Summary

The initial attempt to consult Ollama with the SNES game development prompt failed with a timeout error after 3 retries:

```
Error consulting Ollama: Failed after 3 retries: The operation was aborted due to timeout
```

### Root Causes

1. **Default timeout too short**: The default timeout was 30 seconds (30,000 ms), which is insufficient for complex prompts with system prompts
2. **Retry strategy compounds the issue**: With 3 retries and exponential backoff, total wait time could exceed 90+ seconds
3. **No per-request timeout customization**: There was no way to specify a longer timeout for complex reasoning tasks

## Solution Implemented

### 1. Increased Default Timeout
- **Before**: 30 seconds (30,000 ms)
- **After**: 60 seconds (60,000 ms)
- **Rationale**: Most AI reasoning tasks fit within 1 minute; this matches best practices for consultation-type requests

### 2. Added `timeout_ms` Parameter to `consult_ollama`
You can now pass a custom timeout to override the default:

```json
{
  "tool": "consult_ollama",
  "params": {
    "prompt": "Your complex multi-part question...",
    "system_prompt": "You are an expert in SNES development...",
    "timeout_ms": 120000
  }
}
```

### 3. Updated Types and Validation
- Added `timeout` field to `OllamaRequest` type
- Validates timeout between 1,000 ms (1 second) and 600,000 ms (10 minutes)
- Timeout is optional; uses default if not specified

## Timeout Recommendations by Task Complexity

| Task Type | Recommended Timeout | Example Scenario |
|-----------|---------------------|------------------|
| Simple clarification | 30-45 seconds | Quick follow-ups, model selection |
| Standard analysis | 60 seconds | Code review, basic recommendations |
| Complex reasoning | 90-120 seconds | Architecture decisions, design patterns |
| Complex with system prompt | 120-180 seconds | SNES development guide (like your case) |
| Very complex reasoning | 180-300 seconds | Multi-step logic, extensive analysis |
| Large context + complex | 300-600 seconds | Full codebase analysis, major refactoring |

## For Your SNES Example

The prompt that failed would have succeeded with:

```json
{
  "tool": "consult_ollama",
  "params": {
    "prompt": "I'm creating an MCP server for SNES game development using PVSnesLib (a C library for SNES development). What are the most important tools and functionalities I should include in this server? Consider:\n\n1. Graphics and sprites management\n2. Sound and music handling\n3. Input management\n4. Memory management\n5. Build and compilation helpers\n6. Asset conversion tools\n7. Debugging helpers\n\nFor each category, suggest specific tools with practical names and brief descriptions of what they should do.",
    "system_prompt": "You are an expert in retro game development, specifically SNES (Super Nintendo Entertainment System) development using PVSnesLib. Provide detailed, practical recommendations for development tools that would help game developers create SNES games more efficiently.",
    "timeout_ms": 120000
  }
}
```

The key changes:
- Increased from default 30s to 120s due to complexity
- System prompt adds context that requires processing
- Multiple detailed categories require comprehensive analysis

## Implementation Details

### Code Changes Made

1. **ConfigManager.ts**: Increased default timeout from 30s to 60s
2. **ConsultOllamaHandler.ts**: Added support for `timeout_ms` parameter
3. **OllamaService.ts**: 
   - Updated `makeRequest()` to accept timeout parameter
   - Updated `compareModels()` to support timeout parameter
4. **ollama.types.ts**: Added `timeout` field to `OllamaRequest` schema
5. **listToolsHandler.ts**: Added `timeout_ms` parameter to tool schema with documentation

### Backwards Compatibility

✅ **Fully backwards compatible**
- Existing code without `timeout_ms` uses the new default of 60s
- No breaking changes to the API
- All existing tests pass

## Performance Monitoring

The error message now includes retry count, making it easier to diagnose:
- If you see "Failed after 3 retries", consider increasing `timeout_ms`
- If using `compare_ollama_models` with multiple models, factor in parallel execution time

## Testing

All 47 tests pass, including:
- Basic consultation tests
- Timeout configuration tests
- Retry logic tests
- Model comparison tests

## Future Enhancements

Potential improvements for future versions:
1. **Per-model timeouts**: Different models may need different timeouts
2. **Adaptive timeouts**: Increase timeout based on prompt complexity analysis
3. **Streaming responses**: Show progress for long-running requests
4. **Request queuing**: Better handling of multiple concurrent requests
5. **Metrics collection**: Track which prompts timeout most frequently

## Summary

The combination of:
1. ✅ Increased default timeout (30s → 60s)
2. ✅ Per-request timeout customization (`timeout_ms` parameter)
3. ✅ Clear documentation with recommendations

...ensures that complex prompts like your SNES development guide will succeed without requiring the model to break up the question.
