#!/usr/bin/env python3
"""
Quick test to verify the FastMCP server setup.
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fast_consult import app

async def test_tools():
    """Test that all tools are registered."""
    print("🔍 Checking registered tools...")

    # Get the tools from the app
    try:
        tools = await app.get_tools()
        print(f"✅ Found {len(tools)} tools registered")

        print("\n📋 Registered tools:")
        for tool in tools:
            print(f"   - {tool}")

        expected_tools = {
            "consult_ollama",
            "list_ollama_models",
            "compare_ollama_models",
            "remember_consult"
        }

        actual_tools = set(tools)
        if expected_tools.issubset(actual_tools):
            print("✅ All expected tools are registered!")
        else:
            missing = expected_tools - actual_tools
            print(f"❌ Missing tools: {missing}")

    except Exception as e:
        print(f"❌ Error getting tools: {e}")

    print("\n🔍 Checking registered prompts...")

    # Get the prompts from the app
    try:
        prompts = await app.get_prompts()
        print(f"✅ Found {len(prompts)} prompts registered")

        print("\n📝 Registered prompts:")
        for prompt in prompts:
            print(f"   - {prompt}")

        expected_prompts = {
            "consultation_workflow",
            "consultation_prompt",
            "comparison_prompt",
            "memory_prompt"
        }

        actual_prompts = set(prompts)
        if expected_prompts.issubset(actual_prompts):
            print("✅ All expected prompts are registered!")
        else:
            missing = expected_prompts - actual_prompts
            print(f"❌ Missing prompts: {missing}")

    except Exception as e:
        print(f"❌ Error getting prompts: {e}")

    print("\n✅ Setup verification complete!")

if __name__ == "__main__":
    asyncio.run(test_tools())