#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import path from "path";

// Test the sequential consultation chain functionality
async function testSequentialChain() {
  const serverPath = path.resolve("dist/index.js");
  
  console.log("Testing Sequential Consultation Chain...");
  
  // Create transport and client
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath]
  });
  
  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  });

  try {
    // Connect to the server
    await client.connect(transport);
    console.log("Connected to MCP server");

    // Test sequential chain with a code review scenario
    const chainParams = {
      consultants: [
        {
          id: "architect",
          model: "glm-4.6:cloud",
          prompt: "Analyze this function for architectural improvements:\n\n```python\ndef process_order(order_data):\n    if not order_data:\n        return False\n    total = 0\n    for item in order_data['items']:\n        total += item['price'] * item['quantity']\n    order_data['total'] = total\n    database.save(order_data)\n    send_email(order_data['customer_email'], 'Order confirmed')\n    return True\n```"
        },
        {
          id: "reviewer",
          model: "qwen3-coder:480b-cloud",
          prompt: "Building on the architectural analysis, review this function for best practices and potential improvements."
        }
      ],
      context: {
        systemPrompt: "You are an expert software engineer doing code review. Provide specific, actionable feedback.",
        passThrough: true
      },
      flowControl: {
        continueOnError: false,
        maxRetries: 1
      }
    };

    console.log("Calling sequential_consultation_chain...");
    const result = await client.callTool({
      name: "sequential_consultation_chain",
      arguments: chainParams
    });

    console.log("Sequential Chain Result:");
    console.log("=".repeat(50));
    
    if (result.isError) {
      console.log("Error:", result.content[0]?.text);
    } else {
      console.log(result.content[0]?.text);
    }

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await client.close();
  }
}

// Run the test
testSequentialChain().catch(console.error);