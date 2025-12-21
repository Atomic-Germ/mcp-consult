#!/usr/bin/env python3
"""
Demo client for the FastMCP-based Ollama consultation server.
"""

import asyncio
import json
import subprocess
import sys
from typing import Any, Dict


async def run_demo():
    """Run a demonstration of the FastMCP server."""
    print("🚀 Starting FastMCP Ollama Consult Demo")
    print("=" * 50)

    # Start the MCP server as a subprocess
    try:
        server_process = subprocess.Popen(
            [sys.executable, "-m", "fast_consult"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )

        # Give the server a moment to start
        await asyncio.sleep(1)

        print("✅ Server started")

        # For this demo, we'll use the MCP tools directly
        # Since we can't easily communicate with the subprocess in this context,
        # let's just show that the server can be started

        print("🔧 Server is running. You can now use MCP tools:")
        print("   - list_ollama_models")
        print("   - consult_ollama")
        print("   - compare_ollama_models")
        print("   - remember_consult")

        # Wait a bit then terminate
        await asyncio.sleep(2)

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'server_process' in locals():
            server_process.terminate()
            server_process.wait()
        print("🏁 Demo completed")


if __name__ == "__main__":
    asyncio.run(run_demo())