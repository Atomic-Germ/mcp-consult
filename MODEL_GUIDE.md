# MCP Consult - AI Model Quick Start Guide

Welcome! This guide helps AI models understand how to effectively use the mcp-consult server.

## What is mcp-consult?

A Model Context Protocol (MCP) server that lets you:
- 🤖 Consult with local Ollama AI models
- 🔄 Compare responses from multiple models
- 💾 Store and retrieve context across sessions
- 🧠 Build sophisticated multi-model reasoning workflows

## Available Tools

### 1. `consult_ollama` - Ask Any Model

Ask a specific Ollama model a question.

**Parameters:**
- `prompt` (required): Your question
- `model` (optional): Model name (e.g., "llama3.2", "qwen2.5-coder:7b")
- `system_prompt` (optional): System instruction to guide the model
- `temperature` (optional): Creativity level (0.0 = focused, 2.0 = creative)

**Example:**
```json
{
  "tool": "consult_ollama",
  "arguments": {
    "model": "llama3.2",
    "prompt": "Design a scalable API for a real-time chat application",
    "system_prompt": "You are an expert software architect",
    "temperature": 0.7
  }
}
```

**Response Format:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "The response from the model..."
    }
  ]
}
```

---

### 2. `list_ollama_models` - See Available Models

Get a list of all models running on the local Ollama instance.

**Parameters:** None

**Example:**
```json
{
  "tool": "list_ollama_models",
  "arguments": {}
}
```

**Response:**
Returns a JSON array of available models with their names and sizes.

---

### 3. `compare_ollama_responses` - Get Multiple Perspectives

Ask multiple models the same question and compare their responses.

**Parameters:**
- `models` (required): Array of model names
- `prompt` (required): The question
- `context` (optional): Additional context

**Example:**
```json
{
  "tool": "compare_ollama_responses",
  "arguments": {
    "models": ["llama3.2", "qwen2.5-coder:7b", "deepseek-v3.1"],
    "prompt": "What are the pros and cons of microservices?",
    "context": {
      "company_size": "startup",
      "team_experience": "intermediate"
    }
  }
}
```

**Response:**
Returns an array of responses, one per model. If a model fails, you'll see which one and an error message.

---

### 4. `remember_context` - Store Data for Later

Save context that persists for the rest of the session.

**Parameters:**
- `key` (required): A unique identifier
- `value` (required): The data to store
- `metadata` (optional): Extra information about the data

**Example:**
```json
{
  "tool": "remember_context",
  "arguments": {
    "key": "project_requirements",
    "value": "Build a REST API with authentication",
    "metadata": {
      "priority": "high",
      "added_at": "2025-11-17"
    }
  }
}
```

---

## Error Handling

If something goes wrong, the response will include `isError: true`:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: model 'non-existent-model' not found"
    }
  ],
  "isError": true
}
```

**Always check for `isError` flag** to handle failures gracefully.

---

## Tips for Best Results

### 1. Use System Prompts Wisely
```json
{
  "system_prompt": "You are an expert in cloud architecture. Be concise but thorough."
}
```

### 2. Adjust Temperature for Your Needs
- **0.0-0.5**: Focused, factual answers (good for technical questions)
- **0.7**: Balanced (good for general questions)
- **1.0-2.0**: Creative, diverse answers (good for brainstorming)

### 3. Compare Models for Complex Questions
Use `compare_ollama_responses` when you need:
- Multiple perspectives
- Cross-validation of answers
- Comprehensive analysis

### 4. Build on Stored Context
Use `remember_context` to:
- Maintain project state across tool calls
- Share information between different consultations
- Build context chains for complex reasoning

---

## Example Workflow

### Workflow: Design API with Architectural Review

```
1. Get available models
   → list_ollama_models

2. Consult architect model
   → consult_ollama (llama3.2, "Design a REST API for...")

3. Store design in context
   → remember_context (key: "api_design", value: design_response)

4. Get security review from another model
   → consult_ollama (qwen2.5-coder, "Review security of this API: {api_design}")

5. Compare approaches from multiple models
   → compare_ollama_responses (all_models, "Optimization suggestions for...")
```

---

## Common Questions

**Q: How long can I wait for a response?**  
A: Default timeout is 30 seconds. For complex tasks, the server may need longer.

**Q: Can I use variables in prompts?**  
A: Use `{context_key}` syntax to reference stored context from `remember_context`.

**Q: What if a model I want isn't available?**  
A: Use `list_ollama_models` to see what's available, or ask to install it on the Ollama instance.

**Q: How much context can I store?**  
A: Store as much as needed, but remember it persists only for the current session.

**Q: Can responses from one call be used in another?**  
A: Yes! Store them with `remember_context` and reference them in follow-up prompts.

---

## Performance Notes

- First call to a model may be slower (model loading)
- Subsequent calls are faster (model stays in memory)
- `compare_ollama_responses` runs all requests in parallel for speed
- Large models (>30GB) need more time; increase timeout if needed

---

## Getting Help

If you encounter issues:

1. Check that Ollama is running (`http://localhost:11434` by default)
2. Verify the model exists with `list_ollama_models`
3. Try a simpler prompt first to isolate issues
4. Check error messages - they include helpful details

---

**Happy consulting! 🚀**

For more advanced usage, see the main [README.md](README.md).
