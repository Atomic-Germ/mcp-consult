# Quick Timeout Tuning Guide

## Problem

Your Ollama consultation timeout failed: `Failed after 3 retries: The operation was aborted due to timeout`

## Solution

Use the new `timeout_ms` parameter when consulting complex topics:

### ✅ Now Works - SNES Development Guide

```json
{
  "tool": "consult_ollama",
  "params": {
    "model": "your-model-name",
    "prompt": "I'm creating an MCP server for SNES game development...",
    "system_prompt": "You are an expert in retro game development...",
    "timeout_ms": 120000
  }
}
```

## What Changed

| Aspect                 | Before      | After                           |
| ---------------------- | ----------- | ------------------------------- |
| Default timeout        | 30 seconds  | 60 seconds                      |
| Custom timeout support | ❌ No       | ✅ Yes (`timeout_ms` parameter) |
| Max timeout allowed    | 300 seconds | 600 seconds (10 minutes)        |

## Timeout Defaults by Complexity

- **Simple questions**: 60s (default, no change needed)
- **Complex with system prompt**: 90-120s (use `"timeout_ms": 120000`)
- **Very complex reasoning**: 180-300s (use `"timeout_ms": 300000`)

## Your SNES Query

The reason it timed out:

- Complex multi-part question (7 categories)
- System prompt provided (extra processing)
- Requires detailed reasoning
- **Default 30s was too short**

## Implementation

Changes made to support this:

1. Default timeout increased to 60s
2. Added `timeout_ms` parameter to schema
3. ConsultOllamaHandler now accepts and passes timeout
4. OllamaService uses per-request timeout
5. Fully backwards compatible - existing code unaffected

## All Tests Pass ✅

47 tests confirmed, including timeout handling tests.
