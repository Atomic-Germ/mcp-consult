import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

async function demoBridge() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
  });

  const client = new Client({ name: "mcp-demo-bridge", version: "1.0.0" });

  try {
    console.log("Connecting to consult server (spawning 'node dist/index.js')...");
    await client.connect(transport);
    console.log("Connected to consult server.");

    // Create a session ID to represent a Bridge session
    const sessionId = `bridge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    console.log("SessionId:", sessionId);

    // List models and pick one
    const listRes = await client.callTool({ name: "list_ollama_models", arguments: {} }, CallToolResultSchema);
    const firstText = (Array.isArray(listRes.content) ? listRes.content : []).find((c: any) => c.type === "text")?.text || "";
    let modelName = "llama2";
    try {
      const modelsMatch = firstText.match(/Available models:\s*(.*)/i);
      if (modelsMatch && modelsMatch[1]) {
        const models = modelsMatch[1].split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean);
        if (models.length > 0) modelName = models[0];
      }
    } catch (e) {
      // ignore
    }

    const prompt = "Please give a 2-sentence alternative viewpoint to the statement: \"We should rewrite coreutils in Rust.\"";

    console.log("Calling consult_ollama to get a consult...\n");
    const consultRes = await client.callTool({ name: "consult_ollama", arguments: { model: modelName, prompt } }, CallToolResultSchema);
    let consultText = "";
    if (!consultRes.isError) {
      consultText = (Array.isArray(consultRes.content) ? consultRes.content : [])
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n");
    }
    console.log("Consult result:\n", consultText);

    // Remember the consult with a sessionId
    console.log("Saving consult to memory for sessionId via remember_consult...");
    await client.callTool({ name: "remember_consult", arguments: { prompt, model: modelName, response: consultText, sessionId } }, CallToolResultSchema);

    // Search for consults by sessionId
    console.log("Searching consults for this session using search_consults...");
    const searchRes = await client.callTool({ name: "search_consults", arguments: { sessionId } }, CallToolResultSchema);
    const entries: any[] = (Array.isArray(searchRes.content) ? searchRes.content : [])?.[0]?.resource?.results || [];
    console.log("Search results:", entries);

    // If there's a result, read it and critique
    if (entries.length > 0) {
      const filename = entries[0].filename;
      console.log("Reading consult via read_consult: ", filename);
      const readRes = await client.callTool({ name: "read_consult", arguments: { filename } }, CallToolResultSchema);
      console.log("Read content (truncated):", ((readRes as any).content?.[0]?.resource?.text || "").slice(0, 200));

      // Critique
      console.log("Running critique_consult on the saved consult...");
      const critRes = await client.callTool({ name: "critique_consult", arguments: { filename, models: [modelName] } }, CallToolResultSchema);
      if (!critRes.isError) {
        const critText = (Array.isArray(critRes.content) ? critRes.content : []).map((c: any) => c.text).join("\n\n---\n\n");
        console.log("Critique outputs:\n", critText);
      }
    }
  } catch (err: any) {
    console.error("Demo Bridge failed:", err?.message || String(err));
  } finally {
    try {
      console.log("Closing client...");
      await client.close();
    } catch (e) {
      // ignore
    }
  }
}

if (require.main === module) {
  demoBridge().catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });
}

export default demoBridge;
