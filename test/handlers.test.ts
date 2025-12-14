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

  it("remember_consult stores sessionId in file metadata when provided", async () => {
    const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-test-memory-"));
    process.env.MEMORY_DIR = tmpdir;
    const sessionId = "session-xyz";
    (axios as any).post.mockResolvedValue({ data: { response: "remembered text" } });

    const res = await handlers.callToolHandler({ name: "remember_consult", arguments: { prompt: "p", model: "m1", sessionId } });
    expect(res).toBeDefined();
    const files = await fs.readdir(tmpdir);
    expect(files.length).toBeGreaterThan(0);
    const data = JSON.parse(await fs.readFile(path.join(tmpdir, files[0]), "utf-8"));
    expect(data.sessionId).toBe(sessionId);

    // cleanup
    await Promise.all(files.map((f) => fs.unlink(path.join(tmpdir, f))));
    await fs.rmdir(tmpdir);
  });

  it("search_consults returns consults matching sessionId and query", async () => {
    const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-test-memory-"));
    process.env.MEMORY_DIR = tmpdir;
    const payload1 = { key: null, prompt: "Hello world", model: "m1", response: "remembered text", sessionId: "homesession", _meta: { createdAt: new Date().toISOString() } };
    const payload2 = { key: "k2", prompt: "Other prompt", model: "m2", response: "other", sessionId: "othersession", _meta: { createdAt: new Date().toISOString() } };
    await fs.writeFile(path.join(tmpdir, "obs-1.json"), JSON.stringify(payload1, null, 2), "utf-8");
    await fs.writeFile(path.join(tmpdir, "obs-2.json"), JSON.stringify(payload2, null, 2), "utf-8");

    const res1 = await handlers.callToolHandler({ name: "search_consults", arguments: { sessionId: "homesession" } });
    expect(res1).toBeDefined();
    expect(res1.content?.[0]?.resource?.results?.length).toBe(1);
    expect(res1.content?.[0]?.resource?.results?.[0]?.sessionId).toBe("homesession");

    const res2 = await handlers.callToolHandler({ name: "search_consults", arguments: { query: "hello" } });
    expect(res2).toBeDefined();
    expect(res2.content?.[0]?.resource?.results?.length).toBe(1);
    expect(res2.content?.[0]?.resource?.results?.[0]?.prompt).toBe("Hello world");

    // cleanup
    const files = await fs.readdir(tmpdir);
    await Promise.all(files.map((f) => fs.unlink(path.join(tmpdir, f))));
    await fs.rmdir(tmpdir);
  });

  it("list_consults returns saved consult entries", async () => {
    const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-test-memory-"));
    process.env.MEMORY_DIR = tmpdir;
    const payload1 = { key: null, prompt: "p1", model: "m1", response: "r1", _meta: { createdAt: new Date().toISOString() } };
    const payload2 = { key: "k2", prompt: "p2", model: "m2", response: "r2", _meta: { createdAt: new Date().toISOString() } };
    await fs.writeFile(path.join(tmpdir, "observation-1.json"), JSON.stringify(payload1, null, 2), "utf-8");
    await fs.writeFile(path.join(tmpdir, "observation-2.json"), JSON.stringify(payload2, null, 2), "utf-8");

    const res = await handlers.callToolHandler({ name: "list_consults", arguments: {} });
    expect(res).toBeDefined();
    expect(res.content[0].resource.entries).toHaveLength(2);
    expect(res.content[0].resource.entries[0].prompt).toBeDefined();

    // cleanup
    const files = await fs.readdir(tmpdir);
    await Promise.all(files.map((f) => fs.unlink(path.join(tmpdir, f))));
    await fs.rmdir(tmpdir);
  });

  it("read_consult returns the saved file content and metadata", async () => {
    const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-test-memory-"));
    process.env.MEMORY_DIR = tmpdir;
    const payload = { key: null, prompt: "p1", model: "m1", response: "r1", _meta: { createdAt: new Date().toISOString() } };
    const filename = "observation-readme.json";
    await fs.writeFile(path.join(tmpdir, filename), JSON.stringify(payload, null, 2), "utf-8");

    const res = await handlers.callToolHandler({ name: "read_consult", arguments: { filename } });
    expect(res).toBeDefined();
    expect(res.content[0].resource.text).toBeDefined();
    expect(res.content[0].resource.metadata).toBeDefined();
    expect(res.content[0].resource.metadata.prompt).toBe("p1");

    // cleanup
    const files = await fs.readdir(tmpdir);
    await Promise.all(files.map((f) => fs.unlink(path.join(tmpdir, f))));
    await fs.rmdir(tmpdir);
  });

  it("critique_consult runs the models against a saved consult and returns outputs", async () => {
    const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-test-memory-"));
    process.env.MEMORY_DIR = tmpdir;
    const payload = { key: null, prompt: "p1", model: "m1", response: "this is a saved consult", _meta: { createdAt: new Date().toISOString() } };
    const filename = "observation-crit.json";
    await fs.writeFile(path.join(tmpdir, filename), JSON.stringify(payload, null, 2), "utf-8");

    // Prepare mock model tag list and generation
    (axios as any).get.mockResolvedValue({ data: { models: [{ name: "m1" }, { name: "m2" }] } });
    (axios as any).post.mockImplementation((url: string, data: any) => {
      if (data.model === "m1") return Promise.resolve({ data: { response: "crit from m1" } });
      if (data.model === "m2") return Promise.resolve({ data: { response: "crit from m2" } });
      return Promise.resolve({ data: { response: "default" } });
    });

    const res = await handlers.callToolHandler({ name: "critique_consult", arguments: { filename, models: ["m1", "m2"], prompt_prefix: "Please critique" } });
    expect(res).toBeDefined();
    const texts = (res.content || []).map((c: any) => c.text).join("\n");
    expect(texts).toContain("Model m1");
    expect(texts).toContain("Model m2");
    expect(texts).toContain("crit from m1");
    expect(texts).toContain("crit from m2");

    // cleanup
    const files = await fs.readdir(tmpdir);
    await Promise.all(files.map((f) => fs.unlink(path.join(tmpdir, f))));
    await fs.rmdir(tmpdir);
  });
});
