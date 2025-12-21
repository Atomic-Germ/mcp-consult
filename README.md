# Fast Consult

A Python reimplementation of the Ollama consultation MCP server using FastMCP.

## Features

- **🛠️ Tools**: Executable functions for Ollama interactions
  - `consult_ollama`: Consult an Ollama model with a prompt and get its response for reasoning from another viewpoint
  - `list_ollama_models`: List all available Ollama models on the local instance
  - `compare_ollama_models`: Run the same prompt against multiple Ollama models and return their outputs side-by-side for comparison
  - `remember_consult`: Store the result of a consult into a local memory store

- **📝 Prompts**: Reusable templates to guide effective consultations
  - `consultation_workflow`: Guide for the recommended consultation workflow
  - `consultation_prompt`: Template for effective single-model consultations
  - `comparison_prompt`: Template for comparing multiple model responses
  - `memory_prompt`: Template for documenting and storing consultation results

## Recommended Workflow

### Fast Results (Single Model)
1. **List Models**: Use `list_ollama_models` to see available Ollama models
2. **Single Consultation**: Pick one model and use `consult_ollama` for quick results
3. **Save if Helpful**: Use `remember_consult` to store valuable insights

### Better Results (Multiple Models)
1. **List Models**: Use `list_ollama_models` to see available options
2. **Compare Models**: Use `compare_ollama_models` for diverse perspectives (takes ~2x longer)
3. **Save Insights**: Use `remember_consult` to store the best insights

This project uses `uv` for dependency management.

```bash
# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Clone or navigate to the project directory
cd fast-consult

# Install dependencies
uv sync
```

## Usage

### Running the Server

```bash
# Using uv
uv run fast-consult

# Or directly with Python
uv run python fast_consult.py
```

### Environment Variables

- `OLLAMA_BASE_URL`: Base URL for Ollama API (default: `http://localhost:11434`)
- `MEMORY_DIR`: Directory for storing consultation memories (default: `/tmp/fast-consult-memory`)

### Demo

```bash
uv run python demo.py
```

## Comparison with Original TypeScript Version

This Python version provides the same functionality as the original `mcp-consult` TypeScript project:

- ✅ Same MCP tools and functionality
- ✅ Increased timeouts (5 minutes) for better handling of large models
- ✅ Structured JSON output for `compare_ollama_models`
- ✅ Memory storage for consultations
- ✅ Full compatibility with MCP protocol

## Dependencies

- `fastmcp`: FastMCP framework for building MCP servers
- `requests`: HTTP client for Ollama API calls

## License

MIT
