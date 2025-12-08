import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as handlers from "../src/handlers";
import axios from "axios";
import fs from "fs/promises";
import os from "os";
import path from "path";

vi.mock("axios");

describe("handlers", () => {
  beforeEach(() => {
    (axios as any).get = vi.fn();
    (axios as any).post = vi.fn();
  });

  afterEach(async () => {
    vi.resetAllMocks();
    delete process.env.MEMORY_DIR;
  });

  it("list_ollama_models returns available models text", async () => {
    (axios as any).get.mockResolvedValue({ data: { models: [{ name: "m1" }, { name: "m2" }] } });
    const res = await handlers.callToolHandler({ name: "list_ollama_models", arguments: {} });
    expect(res).toBeDefined();
    expect(res.content[0].text).toContain("m1");
    expect(res.content[0].text).toContain("m2");
  });

  it("consult_ollama returns generated text", async () => {
    (axios as any).post.mockResolvedValue({ data: { response: "hello world" } });
    const res = await handlers.callToolHandler({ name: "consult_ollama", arguments: { model: "m1", prompt: "p" } });
    expect(res).toBeDefined();
    expect(res.content[0].text).toBe("hello world");
  });

  it("compare_ollama_models returns outputs from multiple models", async () => {
    (axios as any).get.mockResolvedValue({ data: { models: [{ name: "m1" }, { name: "m2" }] } });
    (axios as any).post.mockImplementation((url: string, data: any) => {
      if (data.model === "m1") return Promise.resolve({ data: { response: "out1" } });
      if (data.model === "m2") return Promise.resolve({ data: { response: "out2" } });
      return Promise.resolve({ data: { response: "default" } });
    });

    const res = await handlers.callToolHandler({ name: "compare_ollama_models", arguments: { models: ["m1", "m2"], prompt: "p" } });
    expect(res).toBeDefined();
    const texts = (res.content || []).map((c: any) => c.text).join("\n");
    expect(texts).toContain("Model m1");
    expect(texts).toContain("Model m2");
    expect(texts).toContain("out1");
    expect(texts).toContain("out2");
  });

  it("remember_consult stores a file in MEMORY_DIR when no response provided", async () => {
    const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-test-memory-"));
    process.env.MEMORY_DIR = tmpdir;
    (axios as any).post.mockResolvedValue({ data: { response: "remembered text" } });

    const res = await handlers.callToolHandler({ name: "remember_consult", arguments: { prompt: "p", model: "m1" } });
    expect(res).toBeDefined();
    const files = await fs.readdir(tmpdir);
    expect(files.length).toBeGreaterThan(0);
    const data = JSON.parse(await fs.readFile(path.join(tmpdir, files[0]), "utf-8"));
    expect(data.response).toBe("remembered text");

    // cleanup
    await Promise.all(files.map((f) => fs.unlink(path.join(tmpdir, f))));
    await fs.rmdir(tmpdir);
  });
});
