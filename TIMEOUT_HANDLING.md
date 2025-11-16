# Timeout Handling in Sequential Consultation Chains

## Issue

When using `sequential_consultation_chain`, some steps (particularly step 2: implementation) may fail due to a 60-second timeout when processing complex or lengthy tasks.

## Solution

**We addressed this in code** rather than encouraging users to break up questions. Here's why:

### Why Breaking Up Questions is Not Proper

1. **Context Loss**: Sequential chains are designed for multi-step reasoning where each consultant builds on previous responses. Breaking up questions loses this critical context.

2. **Defeats Purpose**: The whole point of sequential chains is to maintain conversation flow across multiple consultants.

3. **User Experience**: Users shouldn't have to work around technical limitations when there's a proper solution.

## What We Changed

### 1. Increased Default Timeout
- **Before**: 60 seconds (60000ms)
- **After**: 120 seconds (120000ms)
- **Rationale**: Most complex reasoning tasks complete within 2 minutes

### 2. Per-Consultant Timeout Configuration
The `timeoutMs` parameter was already supported but not well documented:

```json
{
  "consultants": [
    {
      "id": "implementation_specialist",
      "model": "deepseek-v3.1:671b-cloud",
      "prompt": "Generate comprehensive implementation with tests...",
      "timeoutMs": 300000
    }
  ]
}
```

### 3. Documentation
Added clear guidance in:
- `README.md`: Quick reference for timeout configuration
- `sequential_chain_demos.md`: Best practices and recommendations
- Demo examples showing real-world timeout values

## Timeout Recommendations

| Task Type | Recommended Timeout | Example |
|-----------|---------------------|---------|
| Simple analysis | 60-90 seconds | Code review, basic analysis |
| Code generation | 180-300 seconds | Implementation, refactoring |
| Complex reasoning | 180-300 seconds | Architecture decisions, multi-step logic |
| Large context | 300-600 seconds | Processing extensive codebases or documentation |

## Usage Example

```json
{
  "consultants": [
    {
      "id": "analyzer",
      "model": "qwen3-coder:480b-cloud",
      "prompt": "Analyze this function for issues...",
      "timeoutMs": 90000
    },
    {
      "id": "implementer",
      "model": "deepseek-v3.1:671b-cloud", 
      "prompt": "Implement fixes based on the analysis...",
      "timeoutMs": 240000
    },
    {
      "id": "reviewer",
      "model": "glm-4.6:cloud",
      "prompt": "Review the implementation...",
      "timeoutMs": 120000
    }
  ],
  "context": {
    "passThrough": true
  }
}
```

## Alternative Approaches Considered

### ❌ Breaking Questions into Smaller Parts
- **Rejected**: Loses conversation context and defeats the purpose of sequential chains

### ❌ Automatic Retry with Simplified Prompts  
- **Rejected**: May produce lower-quality results and is unpredictable

### ✅ Configurable Per-Consultant Timeouts
- **Chosen**: Gives users control while maintaining context integrity
- Allows different timeouts for different complexity levels
- Preserves the sequential reasoning flow

## When Models Handle Timeouts by Breaking Up

If a model suggests breaking up a question due to timeout:
1. **Use the `timeoutMs` parameter** instead (typically 180000-300000ms for complex tasks)
2. **Keep the sequential chain intact** to preserve context
3. **Only break up** if the task is genuinely too large (e.g., processing 100+ files)

## Monitoring and Debugging

View step duration in the output:

```
**Step 2: implementation_specialist** (deepseek-v3.1:671b-cloud) ✅ Success
Duration: 187432ms
```

If seeing consistent timeouts:
1. Check if the model is under heavy load
2. Consider using a faster model for that step
3. Increase `timeoutMs` to 300000-600000ms
4. Verify Ollama server performance

## Future Considerations

Potential enhancements:
- Dynamic timeout adjustment based on prompt complexity
- Streaming responses to provide progress feedback
- Async execution with status polling
- Model-specific default timeouts based on known performance characteristics
