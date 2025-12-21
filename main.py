#!/usr/bin/env python3
"""
FastMCP-based Ollama consultation server.
Reimplementation of mcp-consult in Python using FastMCP.
"""

import asyncio
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from fastmcp import FastMCP

# Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MEMORY_DIR = os.getenv("MEMORY_DIR", "/tmp/fast-consult-memory")

# Create FastMCP app
app = FastMCP("fast-consult")

def make_ollama_request(endpoint: str, data: Dict[str, Any], timeout: int = 300) -> Dict[str, Any]:
    """Make a request to Ollama with proper timeout handling."""
    url = f"{OLLAMA_BASE_URL}{endpoint}"
    try:
        # Use GET for endpoints that don't need data (like /api/tags)
        # Use POST for endpoints that need JSON data (like /api/generate)
        if endpoint == "/api/tags" or not data:
            response = requests.get(url, timeout=timeout)
        else:
            response = requests.post(url, json=data, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise Exception(f"Ollama request failed: {str(e)}")

@app.tool()
async def consult_ollama(
    model: str,
    prompt: str,
    system_prompt: Optional[str] = None
) -> str:
    """
    Consult an Ollama model with a prompt and get its response for reasoning from another viewpoint.

    Args:
        model: The Ollama model to use
        prompt: The prompt to send to the model
        system_prompt: Optional system prompt to set context

    Returns:
        The model's response
    """
    data = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }

    if system_prompt:
        data["system"] = system_prompt

    try:
        response = make_ollama_request("/api/generate", data)
        return response.get("response", "")
    except Exception as e:
        return f"Error consulting Ollama: {str(e)}"


@app.tool()
async def list_ollama_models() -> str:
    """
    List all available Ollama models on the local instance.

    Returns:
        Comma-separated list of available model names
    """
    try:
        response = make_ollama_request("/api/tags", {}, timeout=30)
        models = [model["name"] for model in response.get("models", [])]
        return f"Available models: {', '.join(models)}"
    except Exception as e:
        return f"Error listing models: {str(e)}"


@app.tool()
async def compare_ollama_models(
    prompt: str,
    models: Optional[List[str]] = None,
    system_prompt: Optional[str] = None
) -> str:
    """
    Run the same prompt against multiple Ollama models and return their outputs side-by-side for comparison.

    Args:
        prompt: The prompt to send to all models
        models: List of model names to use. If not provided, uses first 2 available models
        system_prompt: Optional system prompt to set context

    Returns:
        Structured JSON comparison plus text summary
    """
    # Get available models if not specified
    if not models:
        try:
            response = make_ollama_request("/api/tags", {}, timeout=30)
            available_models = [model["name"] for model in response.get("models", [])]
            models = available_models[:2] if len(available_models) >= 2 else available_models
        except Exception:
            models = ["llama2"]  # fallback

    if not models:
        return "Error: No models available"

    results = {}
    text_outputs = []

    for model in models:
        try:
            data = {
                "model": model,
                "prompt": prompt,
                "stream": False
            }
            if system_prompt:
                data["system"] = system_prompt

            response = make_ollama_request("/api/generate", data)
            model_response = response.get("response", "")

            results[model] = {
                "response": model_response,
                "success": True,
                "timestamp": time.time()
            }
            text_outputs.append(f"Model {model}:\n{model_response}")

        except Exception as e:
            error_msg = str(e)
            results[model] = {
                "error": error_msg,
                "success": False,
                "timestamp": time.time()
            }
            text_outputs.append(f"Model {model} failed: {error_msg}")

    # Create structured JSON output
    structured_output = {
        "comparison": results,
        "metadata": {
            "prompt": prompt,
            "system_prompt": system_prompt,
            "models_used": models,
            "timestamp": time.time()
        }
    }

    # Return JSON first, then text summary
    return f"{json.dumps(structured_output, indent=2)}\n\n--- Text Summary ---\n\n" + "\n\n---\n\n".join(text_outputs)


@app.tool()
async def remember_consult(
    prompt: str,
    key: Optional[str] = None,
    model: Optional[str] = None,
    response: Optional[str] = None
) -> str:
    """
    Store the result of a consult into a local memory store.

    Args:
        prompt: The prompt that was used
        key: Optional key for the memory entry
        model: Optional model name that was used
        response: The response to store. If not provided, will generate one using the model

    Returns:
        Success message with file path
    """
    # Generate response if not provided
    if not response and model:
        try:
            data = {
                "model": model,
                "prompt": prompt,
                "stream": False
            }
            ollama_response = make_ollama_request("/api/generate", data)
            response = ollama_response.get("response", "")
        except Exception as e:
            return f"Failed to generate response: {str(e)}"
    elif not response:
        return "Error: Missing 'response' and no 'model' provided to generate it."

    # Ensure memory directory exists
    memory_path = Path(MEMORY_DIR)
    memory_path.mkdir(parents=True, exist_ok=True)

    # Create unique filename
    import uuid
    filename = f"observation-{int(time.time())}-{str(uuid.uuid4())[:8]}.json"
    file_path = memory_path / filename

    # Create memory entry
    memory_entry = {
        "key": key,
        "prompt": prompt,
        "model": model,
        "response": response,
        "_meta": {
            "created_at": time.time(),
            "created_iso": time.ctime(time.time())
        }
    }

    # Write to file
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(memory_entry, f, indent=2, ensure_ascii=False)

        return f"Saved consult to {file_path}"
    except Exception as e:
        return f"Failed to save memory: {str(e)}"


@app.prompt("consultation_workflow")
def consultation_workflow_guide() -> list[dict]:
    """
    Guide for the recommended Ollama consultation workflow.

    This prompt explains the optimal workflow for getting the best results
    from Ollama model consultations.
    """
    return [
        {
            "role": "user",
            "content": """# Ollama Consultation Workflow Guide

## Recommended Workflow (Fast Results)
1. **List Models**: Use `list_ollama_models` to see available Ollama models
2. **Single Consultation**: Pick one model and use `consult_ollama` for quick results
3. **Save if Helpful**: Use `remember_consult` to store valuable insights

## Alternative Workflow (Better Results, Slower)
1. **List Models**: Use `list_ollama_models` to see available options
2. **Compare Models**: Use `compare_ollama_models` for diverse perspectives (takes ~2x longer)
3. **Save Insights**: Use `remember_consult` to store the best insights

## Tips for Best Results
- **Model Selection**: Try different models for varied perspectives
- **Clear Prompts**: Be specific about what alternative viewpoint you want
- **System Prompts**: Use system_prompt for additional context/instructions
- **Comparison**: Use comparison when you need multiple angles on a topic
- **Memory**: Save consultations that provide unique or valuable insights

## Available Tools
- `list_ollama_models`: Discover available models
- `consult_ollama`: Quick consultation with single model
- `compare_ollama_models`: Compare multiple models (better but slower)
- `remember_consult`: Store valuable consultation results"""
        }
    ]


@app.prompt("consultation_prompt")
def consultation_prompt_template(
    topic: str,
    desired_perspective: str = "alternative viewpoint",
    context: Optional[str] = None
) -> list[dict]:
    """
    Template for effective Ollama consultations.

    Args:
        topic: The main topic or question to consult about
        desired_perspective: What kind of viewpoint to request (e.g., "critical analysis", "practical considerations")
        context: Additional context or background information
    """
    base_prompt = f"Please provide a {desired_perspective} on: {topic}"

    if context:
        base_prompt += f"\n\nContext: {context}"

    base_prompt += "\n\nKeep your response concise but insightful (3-4 sentences)."

    messages = [
        {
            "role": "user",
            "content": base_prompt
        }
    ]

    return messages


@app.prompt("comparison_prompt")
def comparison_prompt_template(
    topic: str,
    aspect_to_compare: str = "different perspectives",
    context: Optional[str] = None
) -> list[dict]:
    """
    Template for comparing multiple Ollama models.

    Args:
        topic: The topic to compare across models
        aspect_to_compare: What aspect to focus the comparison on
        context: Additional context for the comparison
    """
    base_prompt = f"Compare {aspect_to_compare} on the topic: {topic}"

    if context:
        base_prompt += f"\n\nContext: {context}"

    base_prompt += """

Provide a balanced analysis considering:
- Different approaches or viewpoints
- Strengths and limitations of each perspective
- Practical implications or considerations

Structure your response to highlight key differences and similarities."""

    messages = [
        {
            "role": "user",
            "content": base_prompt
        }
    ]

    return messages


@app.prompt("memory_prompt")
def memory_prompt_template(
    consultation_topic: str,
    key_insights: str,
    model_used: Optional[str] = None
) -> list[dict]:
    """
    Template for documenting consultation results in memory.

    Args:
        consultation_topic: What the consultation was about
        key_insights: The main insights or valuable points from the consultation
        model_used: Which Ollama model provided the insights
    """
    memory_content = f"Consultation on: {consultation_topic}\n\nKey Insights:\n{key_insights}"

    if model_used:
        memory_content += f"\n\nModel Used: {model_used}"

    memory_content += "\n\nStored for future reference and analysis."

    messages = [
        {
            "role": "user",
            "content": f"""# Memory Storage Guide

## Consultation Summary
{memory_content}

## Storage Instructions
Use the `remember_consult` tool with these parameters:
- **prompt**: "{consultation_topic}"
- **response**: "{key_insights}"
- **model**: "{model_used or 'unknown'}"
- **key**: Optional descriptive key for easy retrieval

This will save the consultation for future reference and help build a knowledge base of valuable insights."""
        }
    ]

    return messages


if __name__ == "__main__":
    # Run the MCP server
    import asyncio
    asyncio.run(app.run_stdio_async())


def main():
    """Entry point for the fast-consult command."""
    import asyncio
    asyncio.run(app.run_stdio_async())