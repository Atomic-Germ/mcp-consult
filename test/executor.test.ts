import { describe, it, expect, beforeEach, vi } from "vitest";
import axios from "axios";

import { FlowExecutor } from "../src/executor";
import { InMemoryStore } from "../src/memory";
import type { Flow } from "../src/types";
import * as handlers from "../src/handlers";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("FlowExecutor", () => {
  it("runs a single model step and persists memory", async () => {
    // Mock axios to return expected Ollama response
    (axios as any).post = vi.fn().mockResolvedValue({ data: { response: "Hello world" } });

    const mem = new InMemoryStore();
    const executor = new FlowExecutor(mem);

    const flow: Flow = { id: "flow1", steps: [{ id: "s1", model: "m1", prompt: "hi", memoryWrite: "greeting" }] };

    const ctx = await executor.run(flow);
    expect(ctx.stepResults["s1"].success).toBe(true);
    expect(ctx.memory["greeting"]).toBe("Hello world");

    const persisted = await mem.load("flow1");
    expect(persisted["greeting"]).toBe("Hello world");
  });

  it("skips a step when condition is false", async () => {
    (axios as any).post = vi.fn().mockResolvedValue({ data: { response: "First" } });

    const mem = new InMemoryStore();
    const executor = new FlowExecutor(mem);

    const flow: Flow = {
      id: "flow2",
      steps: [
        { id: "s1", model: "m1", prompt: "hi", memoryWrite: "greeting" },
        { id: "s2", model: "m1", prompt: "should skip", condition: "memory.greeting.includes('nope')" },
      ],
    };

    const ctx = await executor.run(flow);
    expect(ctx.stepResults["s1"].success).toBe(true);
    // s2 should be skipped entirely (not present in stepResults)
    expect(ctx.stepResults["s2"]).toBeUndefined();
  });

  it("retries failed calls up to retries count", async () => {
    let calls = 0;
    (axios as any).post = vi.fn().mockImplementation(() => {
      calls++;
      if (calls < 3) return Promise.reject(new Error("network"));
      return Promise.resolve({ data: { response: "finally" } });
    });

    const mem = new InMemoryStore();
    const executor = new FlowExecutor(mem);

    const flow: Flow = {
      id: "flow3",
      steps: [{ id: "s1", model: "m1", prompt: "retry", retries: 2, backoffMs: 1, memoryWrite: "out" }],
    };

    const ctx = await executor.run(flow);
    expect(ctx.stepResults["s1"].success).toBe(true);
    expect(ctx.memory["out"]).toBe("finally");
  });

  it("falls back to local MCP handler when tool not registered", async () => {
    // mock the handlers.callToolHandler to simulate a local MCP tool
    const fakeRes = { content: [{ type: "text", text: "tool-output" }] };
    vi.spyOn(handlers, "callToolHandler").mockResolvedValue(fakeRes as any);

    const mem = new InMemoryStore();
    const executor = new FlowExecutor(mem);

    const flow: Flow = {
      id: "flow4",
      steps: [{ id: "t1", tool: "some_local_tool", prompt: "run", memoryWrite: "toolRes" }],
    };

    const ctx = await executor.run(flow);
    expect(ctx.stepResults["t1"].success).toBe(true);
    // The output should be the raw tool response object returned by the handler
    expect(ctx.memory["toolRes"]).toEqual(fakeRes);
  });
});
